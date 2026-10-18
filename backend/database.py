"""
Unified Production Database Interface for Guptchar
Powered exclusively by Neon PostgreSQL (Serverless Cloud Database with asyncpg connection pooling).
All operational data (boards, updates, hashes, telemetry, outbox dispatches, companies, executives)
persists directly in the cloud across all container restarts, redeployments, and scaling instances.
"""

import time
import json
import logging
import secrets
import os
from typing import List, Optional, Set, Tuple, Dict, Any
from .models import (
    RegulatoryBoard, RegulatoryUpdate, OutboxDispatch,
    ImpactedCompany, CompanyExecutiveRecord
)
from .postgres import get_pool

logger = logging.getLogger("guptchar.database")

INITIAL_BOARDS = [
    {
        "id": "sebi",
        "name": "Securities and Exchange Board of India",
        "short_code": "SEBI",
        "jurisdiction": "IN",
        "category": "Securities & Capital Markets",
        "website_url": "https://www.sebi.gov.in",
        "feed_url": "https://www.sebi.gov.in/sebirss.xml",
        "enabled": True,
        "poll_interval_sec": 10
    },
    {
        "id": "rbi",
        "name": "Reserve Bank of India",
        "short_code": "RBI",
        "jurisdiction": "IN",
        "category": "Central Banking & Forex",
        "website_url": "https://www.rbi.org.in",
        "feed_url": "https://rbi.org.in/pressreleases_rss.xml",
        "enabled": True,
        "poll_interval_sec": 10
    },
    {
        "id": "sec",
        "name": "U.S. Securities and Exchange Commission",
        "short_code": "US-SEC",
        "jurisdiction": "US",
        "category": "Securities & Enforcement",
        "website_url": "https://www.sec.gov",
        "feed_url": "https://www.sec.gov/news/pressreleases.rss",
        "enabled": True,
        "poll_interval_sec": 10
    },
    {
        "id": "fca",
        "name": "Financial Conduct Authority",
        "short_code": "UK-FCA",
        "jurisdiction": "UK",
        "category": "Market Conduct & Prudential",
        "website_url": "https://www.fca.org.uk",
        "feed_url": "https://www.fca.org.uk/news/rss.xml",
        "enabled": True,
        "poll_interval_sec": 10
    },
    {
        "id": "esma",
        "name": "European Securities and Markets Authority",
        "short_code": "EU-ESMA",
        "jurisdiction": "EU",
        "category": "Pan-European Securities",
        "website_url": "https://www.esma.europa.eu",
        "feed_url": "https://www.esma.europa.eu/rss.xml",
        "enabled": True,
        "poll_interval_sec": 10
    }
]


async def init_db():
    """Initializes and verifies all tables and schemas directly in Neon PostgreSQL."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS boards (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                short_code VARCHAR(64) NOT NULL,
                jurisdiction VARCHAR(64) NOT NULL,
                category VARCHAR(128) NOT NULL,
                website_url TEXT NOT NULL,
                feed_url TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                poll_interval_sec INTEGER NOT NULL DEFAULT 10,
                last_status VARCHAR(64) NOT NULL DEFAULT 'PENDING',
                last_checked DOUBLE PRECISION,
                last_latency_ms DOUBLE PRECISION,
                last_hash TEXT,
                error_count INTEGER NOT NULL DEFAULT 0,
                total_checks INTEGER NOT NULL DEFAULT 0,
                last_error_msg TEXT
            );

            CREATE TABLE IF NOT EXISTS updates (
                id VARCHAR(64) PRIMARY KEY,
                board_id VARCHAR(64) NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
                board_name VARCHAR(255) NOT NULL,
                jurisdiction VARCHAR(64) NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                summary TEXT,
                category VARCHAR(128) NOT NULL,
                severity VARCHAR(64) NOT NULL,
                detected_at DOUBLE PRECISION NOT NULL,
                published_date TEXT,
                content_hash TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                pinned BOOLEAN NOT NULL DEFAULT FALSE,
                effective_deadline TEXT,
                compliance_urgency VARCHAR(64)
            );

            ALTER TABLE updates ADD COLUMN IF NOT EXISTS effective_deadline TEXT;
            ALTER TABLE updates ADD COLUMN IF NOT EXISTS compliance_urgency VARCHAR(64);

            CREATE TABLE IF NOT EXISTS known_hashes (
                content_hash VARCHAR(255) PRIMARY KEY,
                board_id VARCHAR(64) NOT NULL,
                first_seen DOUBLE PRECISION NOT NULL
            );

            CREATE TABLE IF NOT EXISTS telemetry (
                id SERIAL PRIMARY KEY,
                timestamp DOUBLE PRECISION NOT NULL,
                board_id VARCHAR(64) NOT NULL,
                status VARCHAR(64) NOT NULL,
                latency_ms DOUBLE PRECISION,
                message TEXT
            );

            CREATE TABLE IF NOT EXISTS companies (
                id VARCHAR(64) PRIMARY KEY,
                country VARCHAR(128) NOT NULL DEFAULT 'GLOBAL',
                city VARCHAR(128) NOT NULL DEFAULT 'N/A',
                state VARCHAR(128) DEFAULT 'N/A',
                pincode VARCHAR(32) DEFAULT 'N/A',
                address TEXT DEFAULT 'N/A',
                physical_address TEXT DEFAULT 'N/A',
                company_name VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                normalized_name VARCHAR(255) UNIQUE NOT NULL,
                domain VARCHAR(255) DEFAULT 'N/A',
                sector VARCHAR(255) NOT NULL DEFAULT 'General',
                company_email VARCHAR(255) DEFAULT 'N/A',
                primary_email VARCHAR(255) DEFAULT 'N/A',
                company_phone VARCHAR(64) DEFAULT 'N/A',
                phone VARCHAR(64) DEFAULT 'N/A',
                
                subscription_status VARCHAR(64) NOT NULL DEFAULT 'NOT_SUBSCRIBED',
                is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
                subscription_tier VARCHAR(64) NOT NULL DEFAULT 'UNSUBSCRIBED',
                subscribed_at DOUBLE PRECISION,

                founder_name VARCHAR(255) DEFAULT 'N/A',
                founder_title VARCHAR(255) DEFAULT 'N/A',
                founder_email VARCHAR(255) DEFAULT 'N/A',
                founder_phone VARCHAR(64) DEFAULT 'N/A',

                ceo_name VARCHAR(255) DEFAULT 'N/A',
                ceo_email VARCHAR(255) DEFAULT 'N/A',
                ceo_phone VARCHAR(64) DEFAULT 'N/A',

                md_name VARCHAR(255) DEFAULT 'N/A',
                md_email VARCHAR(255) DEFAULT 'N/A',
                md_phone VARCHAR(64) DEFAULT 'N/A',

                trust_score INTEGER DEFAULT 0,
                verification_status VARCHAR(64) DEFAULT 'UNVERIFIED',
                verified_at DOUBLE PRECISION,
                verification_report_json TEXT DEFAULT '{}',

                executives_json TEXT DEFAULT '[]',
                data_provenance VARCHAR(64) DEFAULT 'Website',
                first_seen_at DOUBLE PRECISION NOT NULL,
                last_seen_at DOUBLE PRECISION NOT NULL
            );

            CREATE TABLE IF NOT EXISTS company_executives (
                id VARCHAR(64) PRIMARY KEY,
                company_id VARCHAR(64) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                role_type VARCHAR(64) NOT NULL DEFAULT 'EXECUTIVE',
                email VARCHAR(255) DEFAULT 'N/A',
                phone VARCHAR(64) DEFAULT 'N/A',
                linkedin_url TEXT DEFAULT 'N/A',
                provenance VARCHAR(64) DEFAULT 'Website',
                created_at DOUBLE PRECISION NOT NULL
            );

            CREATE TABLE IF NOT EXISTS outbox_dispatches (
                id VARCHAR(64) PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                recipient_email VARCHAR(255) NOT NULL,
                sector VARCHAR(255) NOT NULL,
                region VARCHAR(128) NOT NULL,
                announcement_id VARCHAR(64) NOT NULL,
                announcement_title TEXT NOT NULL,
                board_name VARCHAR(255) NOT NULL,
                severity VARCHAR(64) NOT NULL,
                risk_summary TEXT,
                email_subject TEXT NOT NULL,
                email_body TEXT NOT NULL,
                status VARCHAR(64) NOT NULL DEFAULT 'PENDING_REVIEW',
                created_at DOUBLE PRECISION NOT NULL,
                reviewed_at DOUBLE PRECISION,
                executives_info TEXT,
                sec_filing_info TEXT,
                is_subscribed BOOLEAN DEFAULT FALSE,
                subscription_tier VARCHAR(64) DEFAULT 'UNSUBSCRIBED',
                template_type VARCHAR(64) DEFAULT 'PROSPECT_EARLY_WARNING'
            );

            ALTER TABLE outbox_dispatches ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;
            ALTER TABLE outbox_dispatches ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(64) DEFAULT 'UNSUBSCRIBED';
            ALTER TABLE outbox_dispatches ADD COLUMN IF NOT EXISTS template_type VARCHAR(64) DEFAULT 'PROSPECT_EARLY_WARNING';

            -- Operator & Administrator Authentication Table
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(64) PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(64) NOT NULL DEFAULT 'ADMIN',
                created_at DOUBLE PRECISION NOT NULL
            );

            -- AI Regulatory Intelligence & Sector Impact Deduplication Cache
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

            -- Indexes for fast querying
            CREATE INDEX IF NOT EXISTS idx_announcement_analyses_sector ON announcement_analyses (primary_sector);
            CREATE INDEX IF NOT EXISTS idx_announcement_analyses_time ON announcement_analyses (analyzed_at DESC);
            CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
            CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
            CREATE INDEX IF NOT EXISTS idx_updates_detected ON updates (detected_at DESC);
            CREATE INDEX IF NOT EXISTS idx_updates_board ON updates (board_id);
            CREATE INDEX IF NOT EXISTS idx_known_hashes_board ON known_hashes (board_id);
            CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_dispatches (status);
            CREATE INDEX IF NOT EXISTS idx_telemetry_time ON telemetry (timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_companies_country ON companies (country);
            CREATE INDEX IF NOT EXISTS idx_companies_city ON companies (city);
            CREATE INDEX IF NOT EXISTS idx_companies_subscription ON companies (subscription_status);
            CREATE INDEX IF NOT EXISTS idx_company_executives_comp_id ON company_executives (company_id);

            -- Analytical View for CRM & Country Queries
            CREATE OR REPLACE VIEW countries_companies_view AS
            SELECT 
                country,
                state,
                city,
                pincode,
                address,
                company_name,
                company_email,
                sector,
                company_phone,
                founder_name,
                founder_email,
                founder_phone,
                ceo_name,
                ceo_email,
                ceo_phone,
                md_name,
                md_email,
                md_phone,
                subscription_status,
                subscription_tier,
                is_subscribed,
                trust_score,
                verification_status
            FROM companies
            ORDER BY country ASC, state ASC, city ASC, company_name ASC;
        """)

        # Seed initial regulatory boards if empty
        count = await conn.fetchval("SELECT COUNT(*) FROM boards;")
        if count == 0:
            for b in INITIAL_BOARDS:
                await conn.execute("""
                    INSERT INTO boards (
                        id, name, short_code, jurisdiction, category,
                        website_url, feed_url, enabled, poll_interval_sec,
                        last_status, total_checks, error_count
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', 0, 0)
                    ON CONFLICT (id) DO NOTHING;
                """, b["id"], b["name"], b["short_code"], b["jurisdiction"], b["category"],
                     b["website_url"], b["feed_url"], b["enabled"], b["poll_interval_sec"])
            logger.info(f"Seeded {len(INITIAL_BOARDS)} initial regulatory boards into Neon PostgreSQL.")

        # Seed initial operator user if empty AND explicit credentials are provided in environment
        user_count = await conn.fetchval("SELECT COUNT(*) FROM users;")
        if user_count == 0:
            init_username = os.getenv("INITIAL_ADMIN_USERNAME") or os.getenv("INITIAL_USER_USERNAME") or os.getenv("AUTH_ADMIN_USERNAME", "")
            init_email = os.getenv("INITIAL_ADMIN_EMAIL") or os.getenv("INITIAL_USER_EMAIL") or os.getenv("AUTH_ADMIN_EMAIL", "")
            init_password = os.getenv("INITIAL_ADMIN_PASSWORD") or os.getenv("INITIAL_USER_PASSWORD") or os.getenv("AUTH_ADMIN_PASSWORD", "")

            # Only seed if password and username are non-empty and NOT default 'admin' / 'admin123'
            if init_username.strip() and init_email.strip() and init_password.strip() and init_password.strip() != "admin123":
                from .auth_service import hash_password
                pwd_hash = hash_password(init_password.strip())
                u_id = f"usr_{secrets.token_hex(8)}"
                now = time.time()
                await conn.execute("""
                    INSERT INTO users (id, username, email, password, role, created_at)
                    VALUES ($1, $2, $3, $4, 'ADMIN', $5)
                    ON CONFLICT (username) DO NOTHING;
                """, u_id, init_username.strip(), init_email.strip().lower(), pwd_hash, now)
                logger.info(f"Provisioned initial operator user '{init_username.strip()}' into Neon PostgreSQL.")

    logger.info("Neon PostgreSQL schema verification and initial seeding complete.")


# ==============================================================================
# BOARDS SURVEILLANCE REPOSITORY
# ==============================================================================

async def get_all_boards() -> List[RegulatoryBoard]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM boards ORDER BY jurisdiction ASC, short_code ASC;")
        boards = []
        for r in rows:
            d = dict(r)
            boards.append(RegulatoryBoard(
                id=d["id"],
                name=d["name"],
                short_code=d["short_code"],
                jurisdiction=d["jurisdiction"],
                category=d["category"],
                website_url=d["website_url"],
                feed_url=d["feed_url"],
                enabled=bool(d["enabled"]),
                poll_interval_sec=d["poll_interval_sec"],
                last_status=d["last_status"],
                last_checked=d["last_checked"],
                last_latency_ms=d["last_latency_ms"],
                last_hash=d["last_hash"],
                error_count=d["error_count"],
                total_checks=d["total_checks"],
                last_error_msg=d["last_error_msg"]
            ))
        return boards


async def add_custom_board(board: RegulatoryBoard):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO boards (
                id, name, short_code, jurisdiction, category,
                website_url, feed_url, enabled, poll_interval_sec,
                last_status, total_checks, error_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', 0, 0)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                short_code = EXCLUDED.short_code,
                jurisdiction = EXCLUDED.jurisdiction,
                category = EXCLUDED.category,
                website_url = EXCLUDED.website_url,
                feed_url = EXCLUDED.feed_url,
                poll_interval_sec = EXCLUDED.poll_interval_sec;
        """, board.id, board.name, board.short_code, board.jurisdiction, board.category,
             board.website_url, board.feed_url, board.enabled, board.poll_interval_sec)


async def toggle_board_enabled(board_id: str, enabled: bool):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE boards SET enabled = $1 WHERE id = $2;", enabled, board_id)


async def update_board_health(board_id: str, status: str, latency_ms: float, new_hash: Optional[str] = None, error_msg: Optional[str] = None):
    now = time.time()
    pool = await get_pool()
    async with pool.acquire() as conn:
        if status == "HEALTHY":
            row = await conn.fetchrow("""
                UPDATE boards
                SET last_status = $1,
                    last_checked = $2,
                    last_latency_ms = $3,
                    last_hash = COALESCE($4, last_hash),
                    total_checks = total_checks + 1,
                    last_error_msg = NULL
                WHERE id = $5
                RETURNING total_checks;
            """, status, now, latency_ms, new_hash, board_id)
        else:
            row = await conn.fetchrow("""
                UPDATE boards
                SET last_status = $1,
                    last_checked = $2,
                    last_latency_ms = $3,
                    error_count = error_count + 1,
                    total_checks = total_checks + 1,
                    last_error_msg = $4
                WHERE id = $5
                RETURNING total_checks;
            """, status, now, latency_ms, error_msg, board_id)

        # Smart Telemetry: Record immediately on issues or new releases; sample healthy pings every 6 cycles (~60s)
        total_checks = row["total_checks"] if row else 1
        should_record = (status != "HEALTHY") or (new_hash is not None) or (total_checks % 6 == 0)
        if should_record:
            await conn.execute("""
                INSERT INTO telemetry (timestamp, board_id, status, latency_ms, message)
                VALUES ($1, $2, $3, $4, $5);
            """, now, board_id, status, latency_ms, error_msg)

        # Periodic telemetry cleanup to prevent unbounded table growth
        if total_checks % 60 == 0:
            await conn.execute("""
                DELETE FROM telemetry 
                WHERE timestamp < (
                    SELECT timestamp FROM telemetry ORDER BY timestamp DESC LIMIT 1 OFFSET 300
                );
            """)


async def delete_board(board_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM boards WHERE id = $1;", board_id)


# ==============================================================================
# HASH WATERMARKING & DEDUPLICATION REPOSITORY
# ==============================================================================

async def get_all_known_hashes() -> Set[str]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT content_hash FROM known_hashes;")
        return {r["content_hash"] for r in rows}


async def add_known_hashes(board_id: str, hashes: List[str]):
    if not hashes:
        return
    now = time.time()
    pool = await get_pool()
    async with pool.acquire() as conn:
        for h in hashes:
            await conn.execute("""
                INSERT INTO known_hashes (content_hash, board_id, first_seen)
                VALUES ($1, $2, $3)
                ON CONFLICT (content_hash) DO NOTHING;
            """, h, board_id, now)


# ==============================================================================
# REGULATORY UPDATES & FEED REPOSITORY
# ==============================================================================

async def save_update(update: RegulatoryUpdate) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            "SELECT id FROM updates WHERE id = $1 OR content_hash = $2;",
            update.id, update.content_hash
        )
        if existing:
            return False

        # Mark hash as known
        await conn.execute("""
            INSERT INTO known_hashes (content_hash, board_id, first_seen)
            VALUES ($1, $2, $3)
            ON CONFLICT (content_hash) DO NOTHING;
        """, update.content_hash, update.board_id, time.time())

        # Insert update
        await conn.execute("""
            INSERT INTO updates (
                id, board_id, board_name, jurisdiction, title, url, summary,
                category, severity, detected_at, published_date, content_hash, is_read, pinned,
                effective_deadline, compliance_urgency
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
                effective_deadline = COALESCE(EXCLUDED.effective_deadline, updates.effective_deadline),
                compliance_urgency = COALESCE(EXCLUDED.compliance_urgency, updates.compliance_urgency);
        """, update.id, update.board_id, update.board_name, update.jurisdiction, update.title,
             update.url, update.summary, update.category, update.severity, update.detected_at,
             update.published_date, update.content_hash, update.is_read, update.pinned,
             update.effective_deadline, update.compliance_urgency)
        return True


async def get_updates(limit: int = 100, board_id: Optional[str] = None, severity: Optional[str] = None) -> List[RegulatoryUpdate]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        query = "SELECT * FROM updates WHERE 1=1"
        params = []
        idx = 1
        if board_id:
            query += f" AND board_id = ${idx}"
            params.append(board_id)
            idx += 1
        if severity:
            query += f" AND severity = ${idx}"
            params.append(severity)
            idx += 1

        query += f" ORDER BY detected_at DESC LIMIT ${idx};"
        params.append(limit)

        rows = await conn.fetch(query, *params)
        updates = []
        for r in rows:
            d = dict(r)
            updates.append(RegulatoryUpdate(
                id=d["id"],
                board_id=d["board_id"],
                board_name=d["board_name"],
                jurisdiction=d["jurisdiction"],
                title=d["title"],
                url=d["url"],
                summary=d["summary"],
                category=d["category"],
                severity=d["severity"],
                detected_at=d["detected_at"],
                published_date=d["published_date"],
                content_hash=d["content_hash"],
                is_read=bool(d["is_read"]),
                pinned=bool(d["pinned"]),
                effective_deadline=d.get("effective_deadline"),
                compliance_urgency=d.get("compliance_urgency")
            ))
        return updates


async def mark_update_read(update_id: str):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE updates SET is_read = TRUE WHERE id = $1;", update_id)


async def mark_all_updates_read():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE updates SET is_read = TRUE;")


async def reset_updates_and_watermark():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM updates;")


# ==============================================================================
# TELEMETRY & AUDIT REPOSITORY
# ==============================================================================

async def record_telemetry(board_id: str, status: str, latency_ms: Optional[float] = None, message: Optional[str] = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO telemetry (timestamp, board_id, status, latency_ms, message)
            VALUES ($1, $2, $3, $4, $5);
        """, time.time(), board_id, status, latency_ms, message)


async def get_telemetry_logs(limit: int = 100):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT t.id, t.timestamp, t.board_id, t.status, t.latency_ms, t.message,
                   b.short_code, b.name, b.jurisdiction
            FROM telemetry t
            LEFT JOIN boards b ON t.board_id = b.id
            ORDER BY t.timestamp DESC LIMIT $1;
        """, limit)
        return [dict(r) for r in rows]


# ==============================================================================
# IMPACTED COMPANIES & DEDUPLICATION REPOSITORY
# ==============================================================================

async def save_or_update_impacted_company(
    company_id: str,
    name: str,
    normalized_name: str,
    domain: str,
    sector: str,
    city: str,
    country: str,
    physical_address: str,
    phone: str,
    primary_email: str,
    executives_json: str,
    data_provenance: str,
    founder_name: str = "N/A",
    founder_title: str = "N/A",
    founder_email: str = "N/A",
    founder_phone: str = "N/A",
    ceo_name: str = "N/A",
    ceo_email: str = "N/A",
    ceo_phone: str = "N/A",
    md_name: str = "N/A",
    md_email: str = "N/A",
    md_phone: str = "N/A",
    address: str = "N/A",
    state: str = "N/A",
    pincode: str = "N/A",
    executives_list: Optional[List[Dict[str, Any]]] = None,
    is_subscribed: bool = False,
    subscription_tier: str = "UNSUBSCRIBED"
) -> Tuple[ImpactedCompany, bool]:
    """
    Saves an impacted company with deduplication, leadership tracking (Founder/CEO/MD with email & phone),
    address, city, state, pincode, and subscription state directly in Neon PostgreSQL.
    """
    import re
    now = time.time()

    if address == "N/A" and physical_address and physical_address != "N/A":
        address = physical_address
    if pincode == "N/A" and physical_address:
        pin_match = re.search(r'\b\d{6}\b', physical_address) or re.search(r'\b\d{5}\b', physical_address)
        if pin_match:
            pincode = pin_match.group(0)

    parsed_execs = []
    if executives_list:
        parsed_execs = executives_list
    elif executives_json and executives_json != "[]":
        try:
            parsed_execs = json.loads(executives_json)
        except Exception:
            parsed_execs = []

    for ex in parsed_execs:
        t_low = (ex.get("title") or "").lower()
        if ("founder" in t_low or "co-founder" in t_low) and founder_name == "N/A":
            founder_name = ex.get("name", "N/A")
            founder_title = ex.get("title", "Founder")
            founder_email = ex.get("email", "N/A")
            founder_phone = ex.get("phone", "N/A")
        if ("ceo" in t_low or "chief executive" in t_low) and ceo_name == "N/A":
            ceo_name = ex.get("name", "N/A")
            ceo_email = ex.get("email", "N/A")
            ceo_phone = ex.get("phone", "N/A")
        if ("managing director" in t_low or t_low.strip() == "md" or "managing partner" in t_low) and md_name == "N/A":
            md_name = ex.get("name", "N/A")
            md_email = ex.get("email", "N/A")
            md_phone = ex.get("phone", "N/A")

    sub_status = "SUBSCRIBED" if is_subscribed else "NOT_SUBSCRIBED"

    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM companies WHERE normalized_name = $1;",
            normalized_name
        )

        if existing:
            resolved_company_id = existing["id"]
            await conn.execute("""
                UPDATE companies
                SET last_seen_at = $1,
                    company_name = $2,
                    name = $2,
                    company_email = CASE WHEN company_email = 'N/A' OR company_email IS NULL THEN $3 ELSE company_email END,
                    company_phone = CASE WHEN company_phone = 'N/A' OR company_phone IS NULL THEN $4 ELSE company_phone END,
                    address = CASE WHEN address = 'N/A' OR address IS NULL THEN $5 ELSE address END,
                    physical_address = CASE WHEN physical_address = 'N/A' OR physical_address IS NULL THEN $5 ELSE physical_address END,
                    state = CASE WHEN state = 'N/A' OR state IS NULL THEN $6 ELSE state END,
                    pincode = CASE WHEN pincode = 'N/A' OR pincode IS NULL THEN $7 ELSE pincode END,
                    primary_email = CASE WHEN primary_email = 'N/A' OR primary_email IS NULL THEN $3 ELSE primary_email END,
                    phone = CASE WHEN phone = 'N/A' OR phone IS NULL THEN $4 ELSE phone END,
                    founder_name = CASE WHEN founder_name = 'N/A' OR founder_name IS NULL THEN $8 ELSE founder_name END,
                    founder_title = CASE WHEN founder_title = 'N/A' OR founder_title IS NULL THEN $9 ELSE founder_title END,
                    founder_email = CASE WHEN founder_email = 'N/A' OR founder_email IS NULL THEN $10 ELSE founder_email END,
                    founder_phone = CASE WHEN founder_phone = 'N/A' OR founder_phone IS NULL THEN $11 ELSE founder_phone END,
                    ceo_name = CASE WHEN ceo_name = 'N/A' OR ceo_name IS NULL THEN $12 ELSE ceo_name END,
                    ceo_email = CASE WHEN ceo_email = 'N/A' OR ceo_email IS NULL THEN $13 ELSE ceo_email END,
                    ceo_phone = CASE WHEN ceo_phone = 'N/A' OR ceo_phone IS NULL THEN $14 ELSE ceo_phone END,
                    md_name = CASE WHEN md_name = 'N/A' OR md_name IS NULL THEN $15 ELSE md_name END,
                    md_email = CASE WHEN md_email = 'N/A' OR md_email IS NULL THEN $16 ELSE md_email END,
                    md_phone = CASE WHEN md_phone = 'N/A' OR md_phone IS NULL THEN $17 ELSE md_phone END
                WHERE id = $18;
            """, now, name, primary_email or "N/A", phone or "N/A", address or "N/A",
                 state or "N/A", pincode or "N/A", founder_name, founder_title,
                 founder_email, founder_phone, ceo_name, ceo_email, ceo_phone,
                 md_name, md_email, md_phone, resolved_company_id)
            is_new = False
        else:
            resolved_company_id = company_id
            await conn.execute("""
                INSERT INTO companies (
                    id, name, normalized_name, domain, sector, city, country,
                    physical_address, phone, primary_email,
                    company_name, company_email, company_phone, address, state, pincode,
                    is_subscribed, subscription_status, subscription_tier, subscribed_at,
                    founder_name, founder_title, founder_email, founder_phone,
                    ceo_name, ceo_email, ceo_phone,
                    md_name, md_email, md_phone,
                    executives_json, data_provenance, first_seen_at, last_seen_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10,
                    $2, $10, $9, $8, $11, $12,
                    $13, $14, $15, $16,
                    $17, $18, $19, $20,
                    $21, $22, $23,
                    $24, $25, $26,
                    $27, $28, $29, $30
                );
            """, resolved_company_id, name, normalized_name, domain or "N/A", sector or "General",
                 city or "N/A", country or "GLOBAL", address or "N/A", phone or "N/A", primary_email or "N/A",
                 state or "N/A", pincode or "N/A", is_subscribed, sub_status, subscription_tier,
                 now if is_subscribed else None, founder_name, founder_title, founder_email, founder_phone,
                 ceo_name, ceo_email, ceo_phone, md_name, md_email, md_phone,
                 executives_json or "[]", data_provenance or "Website", now, now)
            is_new = True

        # Insert executive leadership
        for ex in parsed_execs:
            ex_name = ex.get("name")
            if ex_name and ex_name != "N/A":
                import uuid
                ex_id = ex.get("id") or f"exec_{uuid.uuid4().hex[:10]}"
                await conn.execute("""
                    INSERT INTO company_executives (
                        id, company_id, company_name, name, title, role_type,
                        email, phone, linkedin_url, provenance, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO NOTHING;
                """, ex_id, resolved_company_id, name, ex_name, ex.get("title", "Executive"),
                     ex.get("role_type", "EXECUTIVE"), ex.get("email", "N/A"), ex.get("phone", "N/A"),
                     ex.get("linkedin_url", "N/A"), ex.get("provenance", "Website"), now)

        # Hydrate full company object
        comp_row = await conn.fetchrow("SELECT * FROM companies WHERE id = $1;", resolved_company_id)
        comp_obj = ImpactedCompany(**dict(comp_row))

        exec_rows = await conn.fetch(
            "SELECT * FROM company_executives WHERE company_id = $1 ORDER BY created_at ASC;",
            resolved_company_id
        )
        comp_obj.executives = [CompanyExecutiveRecord(**dict(er)) for er in exec_rows]

    return comp_obj, is_new


async def update_company_subscription(company_id: str, is_subscribed: bool, subscription_tier: str = "ACTIVE_SUBSCRIBER") -> Optional[ImpactedCompany]:
    now = time.time() if is_subscribed else None
    tier = subscription_tier if is_subscribed else "UNSUBSCRIBED"
    sub_status = "SUBSCRIBED" if is_subscribed else "NOT_SUBSCRIBED"

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE companies
            SET is_subscribed = $1,
                subscription_status = $2,
                subscription_tier = $3,
                subscribed_at = $4
            WHERE id = $5;
        """, is_subscribed, sub_status, tier, now, company_id)

    return await get_company_by_id(company_id)


async def update_company_profile(company_id: str, updates: Dict[str, Any]) -> Optional[ImpactedCompany]:
    allowed_cols = {
        "name", "company_name", "country", "city", "state", "pincode",
        "address", "physical_address", "domain", "sector",
        "primary_email", "company_email", "phone", "company_phone",
        "founder_name", "founder_title", "founder_email", "founder_phone",
        "ceo_name", "ceo_email", "ceo_phone",
        "md_name", "md_email", "md_phone",
        "is_subscribed", "subscription_tier"
    }

    pool = await get_pool()
    async with pool.acquire() as conn:
        clauses = []
        params = []
        idx = 1
        for col, val in updates.items():
            if col in allowed_cols:
                clauses.append(f"{col} = ${idx}")
                params.append(val)
                idx += 1
                if col == "name":
                    clauses.append(f"company_name = ${idx}")
                    params.append(val)
                    idx += 1
                elif col == "company_name":
                    clauses.append(f"name = ${idx}")
                    params.append(val)
                    idx += 1
                elif col == "primary_email":
                    clauses.append(f"company_email = ${idx}")
                    params.append(val)
                    idx += 1
                elif col == "phone":
                    clauses.append(f"company_phone = ${idx}")
                    params.append(val)
                    idx += 1
                elif col == "address":
                    clauses.append(f"physical_address = ${idx}")
                    params.append(val)
                    idx += 1

        if not clauses:
            return await get_company_by_id(company_id)

        clauses.append(f"last_seen_at = ${idx}")
        params.append(time.time())
        idx += 1

        params.append(company_id)
        query = f"UPDATE companies SET {', '.join(clauses)} WHERE id = ${idx};"
        await conn.execute(query, *params)

    return await get_company_by_id(company_id)


async def save_company_verification(
    company_id: str,
    trust_score: int,
    verification_status: str,
    verified_at: float,
    verification_report_json: str
) -> Optional[ImpactedCompany]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE companies
            SET trust_score = $1,
                verification_status = $2,
                verified_at = $3,
                verification_report_json = $4
            WHERE id = $5;
        """, trust_score, verification_status, verified_at, verification_report_json, company_id)

    return await get_company_by_id(company_id)


async def get_company_by_id(company_id: str) -> Optional[ImpactedCompany]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM companies WHERE id = $1;", company_id)
        if not row:
            return None
        comp = ImpactedCompany(**dict(row))
        exec_rows = await conn.fetch(
            "SELECT * FROM company_executives WHERE company_id = $1 ORDER BY created_at ASC;",
            company_id
        )
        comp.executives = [CompanyExecutiveRecord(**dict(er)) for er in exec_rows]
        return comp


async def get_all_impacted_companies(
    country: Optional[str] = None,
    is_subscribed: Optional[bool] = None,
    sector: Optional[str] = None,
    limit: int = 100
) -> List[ImpactedCompany]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        query = "SELECT * FROM companies WHERE 1=1"
        params = []
        idx = 1
        if country and country.upper() != "ALL":
            query += f" AND UPPER(country) = UPPER(${idx})"
            params.append(country)
            idx += 1
        if is_subscribed is not None:
            query += f" AND is_subscribed = ${idx}"
            params.append(is_subscribed)
            idx += 1
        if sector and sector.upper() != "ALL":
            query += f" AND sector = ${idx}"
            params.append(sector)
            idx += 1

        query += f" ORDER BY country ASC, last_seen_at DESC LIMIT ${idx};"
        params.append(limit)

        rows = await conn.fetch(query, *params)
        if not rows:
            return []

        # Batch-fetch all executives for all returned companies in a single indexed query (fixes N+1 problem)
        company_ids = [r["id"] for r in rows]
        exec_rows = await conn.fetch(
            "SELECT * FROM company_executives WHERE company_id = ANY($1) ORDER BY created_at ASC;",
            company_ids
        )

        execs_by_comp: Dict[str, List[CompanyExecutiveRecord]] = {}
        for er in exec_rows:
            cid = er["company_id"]
            if cid not in execs_by_comp:
                execs_by_comp[cid] = []
            execs_by_comp[cid].append(CompanyExecutiveRecord(**dict(er)))

        companies = []
        for r in rows:
            comp = ImpactedCompany(**dict(r))
            comp.executives = execs_by_comp.get(comp.id, [])
            companies.append(comp)
        return companies


async def get_companies_count() -> int:
    """Fast, single-count query for UI headers and navigation counters."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        val = await conn.fetchval("SELECT COUNT(*) FROM companies;")
        return int(val) if val is not None else 0


# ==============================================================================
# OUTBOX DISPATCHES REPOSITORY
# ==============================================================================

async def add_outbox_dispatch(dispatch: OutboxDispatch) -> OutboxDispatch:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO outbox_dispatches (
                id, company_name, recipient_email, sector, region,
                announcement_id, announcement_title, board_name, severity,
                risk_summary, email_subject, email_body, status,
                created_at, reviewed_at, executives_info, sec_filing_info,
                is_subscribed, subscription_tier, template_type
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13,
                $14, $15, $16, $17,
                $18, $19, $20
            )
            ON CONFLICT (id) DO UPDATE SET
                company_name = EXCLUDED.company_name,
                recipient_email = EXCLUDED.recipient_email,
                sector = EXCLUDED.sector,
                region = EXCLUDED.region,
                announcement_id = EXCLUDED.announcement_id,
                announcement_title = EXCLUDED.announcement_title,
                board_name = EXCLUDED.board_name,
                severity = EXCLUDED.severity,
                risk_summary = EXCLUDED.risk_summary,
                email_subject = EXCLUDED.email_subject,
                email_body = EXCLUDED.email_body,
                status = EXCLUDED.status,
                executives_info = EXCLUDED.executives_info,
                sec_filing_info = EXCLUDED.sec_filing_info,
                is_subscribed = EXCLUDED.is_subscribed,
                subscription_tier = EXCLUDED.subscription_tier,
                template_type = EXCLUDED.template_type;
        """, dispatch.id, dispatch.company_name, dispatch.recipient_email,
             dispatch.sector, dispatch.region, dispatch.announcement_id,
             dispatch.announcement_title, dispatch.board_name, dispatch.severity,
             dispatch.risk_summary, dispatch.email_subject, dispatch.email_body,
             dispatch.status, dispatch.created_at, dispatch.reviewed_at,
             dispatch.executives_info, dispatch.sec_filing_info,
             dispatch.is_subscribed, dispatch.subscription_tier, dispatch.template_type)
    return dispatch


async def get_outbox_dispatches(status: Optional[str] = None, limit: int = 100) -> List[OutboxDispatch]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        if status and status.upper() != "ALL":
            rows = await conn.fetch(
                "SELECT * FROM outbox_dispatches WHERE status = $1 ORDER BY created_at DESC LIMIT $2;",
                status.upper(), limit
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM outbox_dispatches ORDER BY created_at DESC LIMIT $1;",
                limit
            )
        return [OutboxDispatch(**dict(r)) for r in rows]


async def get_outbox_dispatch_by_id(dispatch_id: str) -> Optional[OutboxDispatch]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM outbox_dispatches WHERE id = $1;", dispatch_id)
        return OutboxDispatch(**dict(row)) if row else None


async def update_outbox_dispatch(dispatch_id: str, updates: Dict[str, Any]) -> Optional[OutboxDispatch]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        clauses = []
        params = []
        idx = 1
        for k, v in updates.items():
            if v is not None and k in ("recipient_email", "email_subject", "email_body", "status"):
                clauses.append(f"{k} = ${idx}")
                params.append(v)
                idx += 1

        if not clauses:
            return await get_outbox_dispatch_by_id(dispatch_id)

        clauses.append(f"reviewed_at = ${idx}")
        params.append(time.time())
        idx += 1

        params.append(dispatch_id)
        sql = f"UPDATE outbox_dispatches SET {', '.join(clauses)} WHERE id = ${idx};"
        await conn.execute(sql, *params)

    return await get_outbox_dispatch_by_id(dispatch_id)


async def approve_and_send_dispatch(dispatch_id: str) -> Optional[OutboxDispatch]:
    now = time.time()
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE outbox_dispatches SET status = 'SENT', reviewed_at = $1 WHERE id = $2;",
            now, dispatch_id
        )
    return await get_outbox_dispatch_by_id(dispatch_id)


async def reject_dispatch(dispatch_id: str) -> Optional[OutboxDispatch]:
    now = time.time()
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE outbox_dispatches SET status = 'REJECTED', reviewed_at = $1 WHERE id = $2;",
            now, dispatch_id
        )
    return await get_outbox_dispatch_by_id(dispatch_id)


async def batch_send_all_pending() -> int:
    now = time.time()
    pool = await get_pool()
    async with pool.acquire() as conn:
        res = await conn.execute(
            "UPDATE outbox_dispatches SET status = 'SENT', reviewed_at = $1 WHERE status = 'PENDING_REVIEW';",
            now
        )
        # asyncpg returns 'UPDATE X'
        try:
            return int(res.split(" ")[1])
        except Exception:
            return 0


async def delete_outbox_dispatch(dispatch_id: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM outbox_dispatches WHERE id = $1;", dispatch_id)
        return True


async def clear_outbox_dispatches() -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM outbox_dispatches;")
        return True


async def get_outbox_counts() -> Dict[str, int]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'PENDING_REVIEW' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) AS sent,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
            FROM outbox_dispatches;
        """)
        return {
            "total": row["total"] or 0,
            "pending": row["pending"] or 0,
            "sent": row["sent"] or 0,
            "rejected": row["rejected"] or 0
        }


# ==============================================================================
# SYSTEM LEVEL CLEAR & STATS
# ==============================================================================

async def clear_all_operational_data():
    """Wipes operational data from Neon PostgreSQL (preserves boards configuration)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            DELETE FROM outbox_dispatches;
            DELETE FROM updates;
            DELETE FROM known_hashes;
            DELETE FROM telemetry;
            DELETE FROM company_executives;
            DELETE FROM companies;
        """)
    logger.info("Operational tables in Neon PostgreSQL cleared successfully.")


# ==============================================================================
# USER & ACCESS REPOSITORY (Neon PostgreSQL)
# ==============================================================================

async def create_user(
    username: str,
    email: str,
    password_hash: str,
    role: str = "ADMIN",
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Persists a new user record into the Neon PostgreSQL users table."""
    pool = await get_pool()
    u_id = user_id or f"usr_{secrets.token_hex(8)}"
    now = time.time()
    clean_user = username.strip()
    clean_email = email.strip().lower()
    
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO users (id, username, email, password, role, created_at)
            VALUES ($1, $2, $3, $4, $5, $6);
        """, u_id, clean_user, clean_email, password_hash, role, now)
        return {
            "id": u_id,
            "username": clean_user,
            "email": clean_email,
            "role": role,
            "created_at": now
        }


async def get_user_by_identity(identity: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user by matching either lowercase username or lowercase email."""
    if not identity:
        return None
    clean_id = identity.strip()
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT id, username, email, password, role, created_at
            FROM users
            WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
            LIMIT 1;
        """, clean_id)
        if row:
            return dict(row)
        return None


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user by primary key ID."""
    if not user_id:
        return None
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT id, username, email, password, role, created_at
            FROM users
            WHERE id = $1
            LIMIT 1;
        """, user_id.strip())
        if row:
            return dict(row)
        return None


async def get_user_count() -> int:
    """Returns total number of registered operators in the users table."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM users;")
        return count or 0


async def list_users() -> List[Dict[str, Any]]:
    """Lists all user accounts (excluding password hashes) for administration."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT id, username, email, role, created_at
            FROM users
            ORDER BY created_at ASC;
        """)
        return [dict(r) for r in rows]


async def update_user_password(user_id: str, new_password_hash: str) -> bool:
    """Updates password hash for a given user."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        res = await conn.execute("""
            UPDATE users SET password = $1 WHERE id = $2;
        """, new_password_hash, user_id)
        return "UPDATE 1" in res


async def delete_user(user_id: str) -> bool:
    """Deletes a user by ID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        res = await conn.execute("""
            DELETE FROM users WHERE id = $1;
        """, user_id)
        return "DELETE 1" in res
