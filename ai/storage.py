"""
Persistence and Caching Layer for AI Regulatory Analysis Results.
Stores analyzed circulars in SQLite to eliminate duplicate LLM inference calls
and provide analytics on sector impact distributions.
"""

import json
import os
import aiosqlite
from typing import Optional, List, Dict
from .config import config
from .models import AnnouncementAnalysis

DB_PATH = config.CACHE_DB_PATH


async def init_ai_db():
    """Initializes the AI analysis cache database schema."""
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
    """Retrieves cached analysis for an announcement if it exists."""
    await init_ai_db()
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
        return None


async def save_analysis(analysis: AnnouncementAnalysis):
    """Saves an analysis record to the SQLite cache."""
    await init_ai_db()
    payload = analysis.model_dump()
    payload_json = json.dumps(payload)

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


async def list_analyses(limit: int = 50, sector_filter: Optional[str] = None) -> List[AnnouncementAnalysis]:
    """Retrieves recent analyses with optional sector filtering."""
    await init_ai_db()
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


async def get_sector_distribution() -> Dict[str, int]:
    """Returns the frequency count of announcements impacting each primary sector."""
    await init_ai_db()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("""
            SELECT primary_sector, COUNT(*) as count 
            FROM announcement_analyses 
            GROUP BY primary_sector 
            ORDER BY count DESC
        """)
        rows = await cursor.fetchall()
        return {r[0]: r[1] for r in rows}
