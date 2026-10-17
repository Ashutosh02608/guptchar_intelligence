import asyncio
import time
import logging
from typing import Dict, List, Set, Optional, Callable, Awaitable
from .models import RegulatoryBoard, RegulatoryUpdate, SystemStats
from .database import (
    get_all_boards, update_board_health, save_update,
    get_updates, init_db, get_all_known_hashes, add_known_hashes,
    reset_updates_and_watermark
)
from .scrapers import fetch_board_feed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [GuptcharEngine] %(message)s")
logger = logging.getLogger("GuptcharEngine")

class RegulatoryMonitoringEngine:
    def __init__(self, cycle_interval_sec: int = 10):
        self.cycle_interval_sec = cycle_interval_sec
        self.is_running = False
        self.started_at = time.time()
        self.last_cycle_start = time.time()
        self.total_checks = 0
        self.total_updates_detected = 0
        self._task: Optional[asyncio.Task] = None
        self._listeners: Set[Callable[[Dict], Awaitable[None]]] = set()
        self._known_hashes: Set[str] = set()
        self._is_baseline_ready = False

    def register_listener(self, callback: Callable[[Dict], Awaitable[None]]):
        self._listeners.add(callback)

    def unregister_listener(self, callback: Callable[[Dict], Awaitable[None]]):
        self._listeners.discard(callback)

    async def broadcast(self, event_type: str, data: Dict):
        message = {
            "type": event_type,
            "timestamp": time.time(),
            "data": data
        }
        for listener in list(self._listeners):
            try:
                await listener(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket listener: {e}")

    async def get_stats(self, boards: Optional[List[RegulatoryBoard]] = None) -> SystemStats:
        now = time.time()
        elapsed_in_cycle = (now - self.last_cycle_start) % self.cycle_interval_sec
        remaining = max(0.0, round(self.cycle_interval_sec - elapsed_in_cycle, 1))
        
        if boards is None:
            boards = await get_all_boards()
        active = [b for b in boards if b.enabled]
        healthy = [b for b in boards if b.last_status == "HEALTHY"]
        errors = sum(b.error_count for b in boards)

        return SystemStats(
            is_running=self.is_running,
            started_at=self.started_at,
            uptime_seconds=round(now - self.started_at, 1),
            total_checks=self.total_checks,
            total_updates_detected=self.total_updates_detected,
            cycle_interval_sec=self.cycle_interval_sec,
            current_cycle_seconds_remaining=remaining,
            monitored_boards_count=len(boards),
            active_boards_count=len(active),
            healthy_boards_count=len(healthy),
            recent_errors_count=errors
        )

    async def initialize_baseline(self):
        """
        Takes an initial snapshot of all currently existing releases on all boards.
        Marks them as known watermark so that only brand NEW releases after this moment are alerted.
        """
        logger.info("🔍 Taking initial snapshot watermark across all regulatory boards...")
        self._known_hashes = await get_all_known_hashes()
        
        boards = await get_all_boards()
        active_boards = [b for b in boards if b.enabled]
        
        for board in active_boards:
            try:
                status, latency_ms, existing_items, error_msg = await fetch_board_feed(board)
                hashes_to_add = [item.content_hash for item in existing_items]
                if hashes_to_add:
                    await add_known_hashes(board.id, hashes_to_add)
                    self._known_hashes.update(hashes_to_add)
                    logger.info(f"📌 Watermarked {len(hashes_to_add)} existing items for {board.short_code}. Only new releases will trigger alerts.")
                await update_board_health(board.id, status, latency_ms, hashes_to_add[0] if hashes_to_add else None, error_msg)
            except Exception as e:
                logger.warning(f"Could not establish watermark for {board.short_code}: {e}")

        self._is_baseline_ready = True
        logger.info(f"🛡️ Baseline established. {len(self._known_hashes)} total historical releases indexed. 24*7 surveillance active.")

    async def check_single_board(self, board: RegulatoryBoard):
        if not board.enabled:
            return

        status, latency_ms, fetched_updates, error_msg = await fetch_board_feed(board)
        self.total_checks += 1
        
        # Check for truly new releases
        for item in fetched_updates:
            if item.content_hash not in self._known_hashes:
                # BRAND NEW RELEASE DETECTED!
                self._known_hashes.add(item.content_hash)
                is_saved = await save_update(item)
                if is_saved:
                    self.total_updates_detected += 1
                    logger.info(f"🚨 [NEW RELEASE DETECTED] {board.short_code} | [{item.severity}] {item.title[:65]}")
                    # Broadcast immediately to frontend clients
                    await self.broadcast("ALERT_NEW_REGULATION", item.dict())
                    # Trigger Autonomous AI Intelligence & Company Extractor Pipeline
                    try:
                        from .intelligence_service import intelligence_service
                        asyncio.create_task(intelligence_service.process_announcement(item))
                    except Exception as e:
                        logger.error(f"Failed to spawn intelligence task: {e}")

        latest_hash = fetched_updates[0].content_hash if fetched_updates else None
        await update_board_health(board.id, status, latency_ms, latest_hash, error_msg)

    async def run_monitoring_cycle(self):
        """Executes a 10-second sweep across all regulatory boards simultaneously."""
        self.last_cycle_start = time.time()
        boards = await get_all_boards()
        active_boards = [b for b in boards if b.enabled]
        
        await self.broadcast("SWEEP_START", {
            "cycle_interval": self.cycle_interval_sec,
            "target_count": len(active_boards),
            "timestamp": time.time()
        })

        tasks = [self.check_single_board(b) for b in active_boards]
        await asyncio.gather(*tasks, return_exceptions=True)

        updated_boards = await get_all_boards()
        stats = await self.get_stats(boards=updated_boards)
        
        await self.broadcast("SWEEP_COMPLETE", {
            "boards": [b.dict() for b in updated_boards],
            "stats": stats.dict()
        })

    async def _loop(self):
        logger.info(f"🛡️ Guptchar 24*7 Surveillance running with {self.cycle_interval_sec}s refresh cadence.")
        self.is_running = True
        
        # Step 1: Establish baseline watermark (so historical items are NOT treated as new alerts)
        await self.initialize_baseline()

        # Step 2: 24*7 monitoring loop
        while self.is_running:
            try:
                await self.run_monitoring_cycle()
                
                # 10-second countdown tick broadcast
                for second in range(self.cycle_interval_sec):
                    if not self.is_running:
                        break
                    remaining = self.cycle_interval_sec - second
                    await self.broadcast("TICK", {
                        "seconds_remaining": remaining,
                        "uptime": round(time.time() - self.started_at, 1)
                    })
                    await asyncio.sleep(1.0)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in monitoring cycle: {e}", exc_info=True)
                await asyncio.sleep(2.0)

    async def start(self):
        if self._task and not self._task.done():
            return
        await init_db()
        self.is_running = True
        self.started_at = time.time()
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def reset_feed_baseline(self):
        """Clears all displayed updates and resets the watermark to current state."""
        await reset_updates_and_watermark()
        self.total_updates_detected = 0
        self._known_hashes.clear()
        await self.initialize_baseline()
        await self.broadcast("FEED_RESET", {})

# Global engine singleton
monitoring_engine = RegulatoryMonitoringEngine(cycle_interval_sec=10)

