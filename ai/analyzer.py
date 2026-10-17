"""
Primary Regulatory Sector Analyzer Engine.
Main entry point for analyzing incoming announcements and extracting impacted sectors.
"""

import asyncio
import logging
import uuid
from typing import List, Dict, Any, Optional, Union

from .models import AnnouncementAnalysis, SectorCategory
from .llm_client import llm_client
from .storage import (
    get_cached_analysis, save_analysis,
    list_analyses, get_sector_distribution, init_ai_db
)

logger = logging.getLogger("GuptcharAI")


class RegulatorySectorAnalyzer:
    """
    Core AI analyzer that ingests regulatory circulars, consults the LLM/Heuristic reasoner,
    and returns a structured impact assessment across industry sectors.
    """

    def __init__(self):
        self._initialized = False

    async def initialize(self):
        if not self._initialized:
            await init_ai_db()
            self._initialized = True

    async def analyze(
        self,
        announcement: Union[Dict[str, Any], Any],
        force_refresh: bool = False
    ) -> AnnouncementAnalysis:
        """
        Analyzes a single announcement dict or object.
        Caches result in SQLite to prevent duplicate computation.
        """
        await self.initialize()

        # Handle either dict or object with attributes
        if isinstance(announcement, dict):
            ann_id = str(announcement.get("id") or announcement.get("content_hash") or f"ann_{uuid.uuid4().hex[:8]}")
            title = announcement.get("title", "")
            authority = announcement.get("board_name") or announcement.get("authority") or "Regulatory Authority"
            jurisdiction = announcement.get("jurisdiction", "GLOBAL")
            summary = announcement.get("summary", "")
            url = announcement.get("url", "")
        else:
            ann_id = str(getattr(announcement, "id", None) or getattr(announcement, "content_hash", None) or f"ann_{uuid.uuid4().hex[:8]}")
            title = getattr(announcement, "title", "")
            authority = getattr(announcement, "board_name", None) or getattr(announcement, "authority", "Regulatory Authority")
            jurisdiction = getattr(announcement, "jurisdiction", "GLOBAL")
            summary = getattr(announcement, "summary", "")
            url = getattr(announcement, "url", "")

        # Check cache unless force_refresh is True
        if not force_refresh:
            cached = await get_cached_analysis(ann_id)
            if cached:
                logger.info(f"⚡ Returning cached sector analysis for '{title[:50]}...'")
                return cached

        logger.info(f"🧠 Analyzing sector impact for [{authority}] '{title[:50]}...'")
        analysis = await llm_client.analyze(
            announcement_id=ann_id,
            title=title,
            authority=authority,
            jurisdiction=jurisdiction,
            summary=summary,
            url=url
        )

        # Persist to cache
        try:
            await save_analysis(analysis)
        except Exception as e:
            logger.warning(f"Failed to persist analysis to cache: {e}")

        return analysis

    async def analyze_batch(
        self,
        announcements: List[Union[Dict[str, Any], Any]],
        max_concurrency: int = 4
    ) -> List[AnnouncementAnalysis]:
        """
        Concurrently analyzes a list of announcements with rate-limiting semaphore.
        """
        semaphore = asyncio.Semaphore(max_concurrency)

        async def _bounded_analyze(item):
            async with semaphore:
                return await self.analyze(item)

        tasks = [_bounded_analyze(a) for a in announcements]
        return await asyncio.gather(*tasks)

    async def get_recent_analyses(self, limit: int = 50, sector: Optional[str] = None) -> List[AnnouncementAnalysis]:
        """Retrieves history of analyzed announcements."""
        return await list_analyses(limit=limit, sector_filter=sector)

    async def get_sector_telemetry(self) -> Dict[str, Any]:
        """Generates a summary of all sector impacts analyzed to date."""
        dist = await get_sector_distribution()
        recent = await list_analyses(limit=10)
        return {
            "total_analyzed": sum(dist.values()),
            "sector_frequency": dist,
            "most_impacted_sector": max(dist, key=dist.get) if dist else None,
            "recent_samples": [
                {
                    "id": a.announcement_id,
                    "title": a.title,
                    "authority": a.authority,
                    "primary_sector": a.primary_sector.value,
                    "impact_score": a.overall_impact_score,
                    "urgency": a.compliance_urgency
                }
                for a in recent
            ]
        }


# Singleton instance for simple import
analyzer = RegulatorySectorAnalyzer()
