"""
Persistence and Caching Layer for AI Regulatory Analysis Results.
Powered by Neon PostgreSQL (with asyncpg connection pooling) with transparent SQLite fallback
to eliminate duplicate LLM inference calls and provide analytics on sector impact distributions.
"""

import json
import os
import logging
from typing import Optional, List, Dict
import aiosqlite

from .config import config
from .models import AnnouncementAnalysis

logger = logging.getLogger("GuptcharAI.Storage")
DB_PATH = config.CACHE_DB_PATH
_migrated_from_sqlite = False


async def _get_pg_pool():
    """Attempts to obtain the central Neon PostgreSQL asyncpg connection pool."""
    try:
        from backend.postgres import get_pool
        return await get_pool()
    except Exception:
        try:
            import sys
            from pathlib import Path
            backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
            if backend_dir not in sys.path:
                sys.path.insert(0, backend_dir)
            from postgres import get_pool
            return await get_pool()
        except Exception:
            return None


async def init_ai_db():
    """
    Initializes the AI analysis cache schema in Neon PostgreSQL.
    Also migrates any legacy cached records from local SQLite if present.
    """
    global _migrated_from_sqlite
    pool = await _get_pg_pool()
    if pool:
        try:
            async with pool.acquire() as conn:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS announcement_analyses (
                        announcement_id VARCHAR(128) PRIMARY KEY,
                        title TEXT NOT NULL,
                        authority VARCHAR(255) NOT NULL,
                        jurisdiction VARCHAR(64) NOT NULL,
                        primary_sector VARCHAR(128) NOT NULL,
                        overall_impact_score DOUBLE PRECISION NOT NULL,
                        compliance_urgency VARCHAR(64) NOT NULL,
                        model_provider_used VARCHAR(128) NOT NULL,
                        analyzed_at DOUBLE PRECISION NOT NULL,
                        payload_json TEXT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_announcement_analyses_sector ON announcement_analyses (primary_sector);
                    CREATE INDEX IF NOT EXISTS idx_announcement_analyses_time ON announcement_analyses (analyzed_at DESC);
                """)

                # One-time migration from SQLite to Neon PostgreSQL
                if not _migrated_from_sqlite and os.path.exists(DB_PATH):
                    try:
                        async with aiosqlite.connect(DB_PATH) as sdb:
                            sdb.row_factory = aiosqlite.Row
                            cursor = await sdb.execute("SELECT * FROM announcement_analyses")
                            rows = await cursor.fetchall()
                            if rows:
                                migrated_count = 0
                                for r in rows:
                                    res = await conn.execute("""
                                        INSERT INTO announcement_analyses (
                                            announcement_id, title, authority, jurisdiction,
                                            primary_sector, overall_impact_score, compliance_urgency,
                                            model_provider_used, analyzed_at, payload_json
                                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                        ON CONFLICT (announcement_id) DO NOTHING;
                                    """, r["announcement_id"], r["title"], r["authority"], r["jurisdiction"],
                                        r["primary_sector"], float(r["overall_impact_score"]), r["compliance_urgency"],
                                        r["model_provider_used"], float(r["analyzed_at"]), r["payload_json"]
                                    )
                                    if res == "INSERT 0 1":
                                        migrated_count += 1
                                if migrated_count > 0:
                                    logger.info(f"✨ Migrated {migrated_count} AI analyses from local SQLite to Neon PostgreSQL.")
                    except Exception as me:
                        logger.debug(f"SQLite migration notice: {me}")
                    _migrated_from_sqlite = True
            return
        except Exception as e:
            logger.warning(f"PostgreSQL AI cache init notice ({e}), falling back to SQLite.")

    # SQLite Fallback
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS announcement_analyses (
                announcement_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                authority TEXT NOT NULL,
                jurisdiction TEXT NOT NULL,
                primary_sector TEXT NOT NULL,
                overall_impact_score REAL NOT NULL,
                compliance_urgency TEXT NOT NULL,
                model_provider_used TEXT NOT NULL,
                analyzed_at REAL NOT NULL,
                payload_json TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_primary_sector ON announcement_analyses (primary_sector);
        """)
        await db.commit()


async def get_cached_analysis(announcement_id: str) -> Optional[AnnouncementAnalysis]:
    """Retrieves cached analysis for an announcement from Neon PostgreSQL or SQLite fallback."""
    await init_ai_db()
    pool = await _get_pg_pool()
    if pool:
        try:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT payload_json FROM announcement_analyses WHERE announcement_id = $1",
                    announcement_id
                )
                if row and row["payload_json"]:
                    data = json.loads(row["payload_json"])
                    return AnnouncementAnalysis(**data)
                return None
        except Exception as e:
            logger.warning(f"Neon PG get_cached_analysis error ({e}), trying SQLite fallback.")

    # SQLite fallback
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT payload_json FROM announcement_analyses WHERE announcement_id = ?",
                (announcement_id,)
            )
            row = await cursor.fetchone()
            if row:
                data = json.loads(row["payload_json"])
                return AnnouncementAnalysis(**data)
    except Exception:
        pass
    return None


async def save_analysis(analysis: AnnouncementAnalysis):
    """Saves an analysis record to Neon PostgreSQL (primary) and SQLite (mirror/fallback)."""
    await init_ai_db()
    payload = analysis.model_dump()
    payload_json = json.dumps(payload)

    pool = await _get_pg_pool()
    if pool:
        try:
            async with pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO announcement_analyses (
                        announcement_id, title, authority, jurisdiction,
                        primary_sector, overall_impact_score, compliance_urgency,
                        model_provider_used, analyzed_at, payload_json
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (announcement_id) DO UPDATE SET
                        overall_impact_score = EXCLUDED.overall_impact_score,
                        compliance_urgency = EXCLUDED.compliance_urgency,
                        model_provider_used = EXCLUDED.model_provider_used,
                        analyzed_at = EXCLUDED.analyzed_at,
                        payload_json = EXCLUDED.payload_json;
                """,
                    analysis.announcement_id,
                    analysis.title,
                    analysis.authority,
                    analysis.jurisdiction,
                    analysis.primary_sector.value,
                    float(analysis.overall_impact_score),
                    str(analysis.compliance_urgency),
                    analysis.model_provider_used,
                    float(analysis.analyzed_at),
                    payload_json
                )
                return
        except Exception as e:
            logger.warning(f"Neon PG save_analysis error ({e}), writing to SQLite fallback.")

    # SQLite Fallback
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("""
                INSERT OR REPLACE INTO announcement_analyses (
                    announcement_id, title, authority, jurisdiction,
                    primary_sector, overall_impact_score, compliance_urgency,
                    model_provider_used, analyzed_at, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis.announcement_id,
                analysis.title,
                analysis.authority,
                analysis.jurisdiction,
                analysis.primary_sector.value,
                analysis.overall_impact_score,
                analysis.compliance_urgency,
                analysis.model_provider_used,
                analysis.analyzed_at,
                payload_json
            ))
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to persist analysis to SQLite fallback: {e}")


async def list_analyses(limit: int = 50, sector_filter: Optional[str] = None) -> List[AnnouncementAnalysis]:
    """Retrieves recent analyses with optional sector filtering from Neon PostgreSQL or SQLite."""
    await init_ai_db()
    pool = await _get_pg_pool()
    if pool:
        try:
            async with pool.acquire() as conn:
                if sector_filter:
                    rows = await conn.fetch(
                        "SELECT payload_json FROM announcement_analyses WHERE primary_sector = $1 ORDER BY analyzed_at DESC LIMIT $2",
                        sector_filter, limit
                    )
                else:
                    rows = await conn.fetch(
                        "SELECT payload_json FROM announcement_analyses ORDER BY analyzed_at DESC LIMIT $1",
                        limit
                    )
                return [AnnouncementAnalysis(**json.loads(r["payload_json"])) for r in rows]
        except Exception as e:
            logger.warning(f"Neon PG list_analyses error ({e}), falling back to SQLite.")

    # SQLite fallback
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            if sector_filter:
                cursor = await db.execute(
                    "SELECT payload_json FROM announcement_analyses WHERE primary_sector = ? ORDER BY analyzed_at DESC LIMIT ?",
                    (sector_filter, limit)
                )
            else:
                cursor = await db.execute(
                    "SELECT payload_json FROM announcement_analyses ORDER BY analyzed_at DESC LIMIT ?",
                    (limit,)
                )
            rows = await cursor.fetchall()
            return [AnnouncementAnalysis(**json.loads(r["payload_json"])) for r in rows]
    except Exception:
        return []


async def get_sector_distribution() -> Dict[str, int]:
    """Returns frequency count of announcements impacting each primary sector from Neon PostgreSQL or SQLite."""
    await init_ai_db()
    pool = await _get_pg_pool()
    if pool:
        try:
            async with pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT primary_sector, COUNT(*) as count 
                    FROM announcement_analyses 
                    GROUP BY primary_sector 
                    ORDER BY count DESC
                """)
                return {r["primary_sector"]: r["count"] for r in rows}
        except Exception as e:
            logger.warning(f"Neon PG get_sector_distribution error ({e}), falling back to SQLite.")

    # SQLite fallback
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute("""
                SELECT primary_sector, COUNT(*) as count 
                FROM announcement_analyses 
                GROUP BY primary_sector 
                ORDER BY count DESC
            """)
            rows = await cursor.fetchall()
            return {r[0]: r[1] for r in rows}
    except Exception:
        return {}
