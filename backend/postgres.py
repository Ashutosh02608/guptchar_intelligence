"""
Neon PostgreSQL Database Connection & Pool Manager
Provides asyncpg connection pooling, SSL negotiation for Neon, health checks, and lifecycle management.
"""

import os
import sys
import time
import asyncio
import logging
from typing import Optional, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
import asyncpg

logger = logging.getLogger("guptchar.postgres")

# Automatically load environment variables from .env in backend or workspace root
env_paths = [
    Path(__file__).parent / ".env",
    Path(__file__).parent.parent / ".env",
]
for p in env_paths:
    if p.exists():
        load_dotenv(p)
        break

_pool: Optional[asyncpg.Pool] = None


def get_database_url() -> str:
    """Retrieve Neon PostgreSQL connection URL from environment variables."""
    url = (
        os.getenv("NEON_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_URL")
        or ""
    ).strip()
    
    # Strip quotes if accidentally added
    if url.startswith(('"', "'")) and url.endswith(('"', "'")):
        url = url[1:-1]
        
    return url


def normalize_neon_url(raw_url: str) -> str:
    """
    Ensure the URL format is compatible with asyncpg.
    Neon URLs usually look like: postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require
    """
    if not raw_url:
        return ""
    
    # Normalize postgres:// to postgresql://
    if raw_url.startswith("postgres://"):
        raw_url = "postgresql://" + raw_url[len("postgres://"):]
    elif raw_url.startswith("postgresql+asyncpg://"):
        raw_url = "postgresql://" + raw_url[len("postgresql+asyncpg://"):]

    return raw_url


async def init_pool(min_size: int = 1, max_size: int = 10) -> Optional[asyncpg.Pool]:
    """Initialize asyncpg connection pool with Neon SSL configuration."""
    global _pool
    if _pool is not None:
        return _pool

    raw_url = get_database_url()
    if not raw_url:
        logger.warning("No DATABASE_URL or NEON_DATABASE_URL set in environment.")
        return None

    db_url = normalize_neon_url(raw_url)

    try:
        # Neon requires SSL. If sslmode is in URL asyncpg handles ssl directly.
        # Passing ssl="require" ensures secure transport if not specified in query.
        needs_ssl = "ssl=" not in db_url.lower() and "sslmode=" not in db_url.lower()
        ssl_arg = "require" if needs_ssl else None

        kwargs = {
            "min_size": min_size,
            "max_size": max_size,
            "command_timeout": 30,
        }
        if ssl_arg:
            kwargs["ssl"] = ssl_arg

        _pool = await asyncpg.create_pool(db_url, **kwargs)
        logger.info("Successfully established Neon PostgreSQL connection pool.")
        return _pool
    except Exception as e:
        logger.error(f"Failed to connect to Neon PostgreSQL: {e}")
        raise


async def close_pool():
    """Gracefully terminate connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Neon PostgreSQL connection pool closed.")


async def get_pool() -> asyncpg.Pool:
    """Return active connection pool or initialize if needed."""
    global _pool
    if _pool is None:
        await init_pool()
    if _pool is None:
        raise RuntimeError("Neon PostgreSQL connection pool is not initialized. Please configure NEON_DATABASE_URL in .env.")
    return _pool


async def get_connection():
    """Acquire a connection from the pool."""
    global _pool
    if _pool is None:
        await init_pool()
    if _pool is None:
        raise RuntimeError("Neon PostgreSQL connection pool is not initialized. Please configure DATABASE_URL.")
async def check_connection() -> Dict[str, Any]:
    """Test connection to Neon PostgreSQL and measure latency."""
    t0 = time.time()
    try:
        pool = await init_pool()
        if not pool:
            return {"connected": False, "error": "No database URL configured"}
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT current_database(), current_user, now(), version();")
            latency = (time.time() - t0) * 1000
            return {
                "connected": True,
                "database": row[0],
                "user": row[1],
                "server_time": str(row[2]),
                "version": row[3],
                "latency_ms": round(latency, 2)
            }
    except Exception as e:
        return {"connected": False, "error": str(e), "latency_ms": round((time.time() - t0) * 1000, 2)}


async def init_postgres_schema():
    """Create schema in Neon PostgreSQL if connected."""
    pool = await init_pool()
    if not pool:
        return
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id VARCHAR(64) PRIMARY KEY,
                    country VARCHAR(128) NOT NULL DEFAULT 'GLOBAL',
                    city VARCHAR(128) NOT NULL DEFAULT 'N/A',
                    state VARCHAR(128) DEFAULT 'N/A',
                    pincode VARCHAR(32) DEFAULT 'N/A',
                    address TEXT DEFAULT 'N/A',
                    company_name VARCHAR(255) NOT NULL,
                    company_email VARCHAR(255) DEFAULT 'N/A',
                    sector VARCHAR(255) NOT NULL,
                    company_phone VARCHAR(64) DEFAULT 'N/A',
                    
                    -- Founder (Name, Email, Phone)
                    founder_name VARCHAR(255) DEFAULT 'N/A',
                    founder_email VARCHAR(255) DEFAULT 'N/A',
                    founder_phone VARCHAR(64) DEFAULT 'N/A',
                    founder_title VARCHAR(255) DEFAULT 'N/A',

                    -- CEO (Name, Email, Phone)
                    ceo_name VARCHAR(255) DEFAULT 'N/A',
                    ceo_email VARCHAR(255) DEFAULT 'N/A',
                    ceo_phone VARCHAR(64) DEFAULT 'N/A',

                    -- MD (Managing Director: Name, Email, Phone)
                    md_name VARCHAR(255) DEFAULT 'N/A',
                    md_email VARCHAR(255) DEFAULT 'N/A',
                    md_phone VARCHAR(64) DEFAULT 'N/A',

                    -- Subscription Status
                    subscription_status VARCHAR(64) NOT NULL DEFAULT 'NOT_SUBSCRIBED',
                    is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
                    subscription_tier VARCHAR(64) NOT NULL DEFAULT 'UNSUBSCRIBED',
                    subscribed_at DOUBLE PRECISION,

                    -- Metadata & deduplication
                    name VARCHAR(255),
                    normalized_name VARCHAR(255) UNIQUE NOT NULL,
                    domain VARCHAR(255) DEFAULT 'N/A',
                    physical_address TEXT DEFAULT 'N/A',
                    phone VARCHAR(64) DEFAULT 'N/A',
                    primary_email VARCHAR(255) DEFAULT 'N/A',
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

                -- Operator & Administrator Authentication Table
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(64) PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(64) NOT NULL DEFAULT 'ADMIN',
                    created_at DOUBLE PRECISION NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
                CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

                -- Migration columns if table already exists
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(128) NOT NULL DEFAULT 'GLOBAL';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(128) NOT NULL DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(128) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS pincode VARCHAR(32) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_email VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_phone VARCHAR(64) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS founder_name VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS founder_email VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS founder_phone VARCHAR(64) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS founder_title VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS ceo_name VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS ceo_email VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS ceo_phone VARCHAR(64) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS md_name VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS md_email VARCHAR(255) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS md_phone VARCHAR(64) DEFAULT 'N/A';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(64) NOT NULL DEFAULT 'NOT_SUBSCRIBED';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(64) NOT NULL DEFAULT 'UNSUBSCRIBED';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscribed_at DOUBLE PRECISION;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_status VARCHAR(64) DEFAULT 'UNVERIFIED';
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_at DOUBLE PRECISION;
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_report_json TEXT DEFAULT '{}';

                -- Backfill company_name, company_email, company_phone, address if empty
                UPDATE companies SET company_name = COALESCE(company_name, name, 'N/A') WHERE company_name IS NULL;
                UPDATE companies SET company_email = COALESCE(company_email, primary_email, 'N/A') WHERE company_email IS NULL;
                UPDATE companies SET company_phone = COALESCE(company_phone, phone, 'N/A') WHERE company_phone IS NULL;
                UPDATE companies SET address = COALESCE(address, physical_address, 'N/A') WHERE address IS NULL;
                UPDATE companies SET subscription_status = CASE WHEN is_subscribed = TRUE THEN 'SUBSCRIBED' ELSE 'NOT_SUBSCRIBED' END;

                -- Outbox subscription tier and template type migrations
                ALTER TABLE outbox_dispatches ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;
                ALTER TABLE outbox_dispatches ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(64) DEFAULT 'UNSUBSCRIBED';
                ALTER TABLE outbox_dispatches ADD COLUMN IF NOT EXISTS template_type VARCHAR(64) DEFAULT 'PROSPECT_EARLY_WARNING';

                -- Indexes for Country-Based Filtering & Executive lookups
                CREATE INDEX IF NOT EXISTS idx_companies_country ON companies (country);
                CREATE INDEX IF NOT EXISTS idx_companies_city ON companies (city);
                CREATE INDEX IF NOT EXISTS idx_companies_state ON companies (state);
                CREATE INDEX IF NOT EXISTS idx_companies_country_sector ON companies (country, sector);
                CREATE INDEX IF NOT EXISTS idx_companies_subscription ON companies (subscription_status);
                CREATE INDEX IF NOT EXISTS idx_company_executives_comp_id ON company_executives (company_id);

                -- Formatted Country View for direct CRM / Analytics
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
        logger.info("Neon PostgreSQL schema (companies, company_executives, countries_companies_view) verified.")
    except Exception as e:
        logger.warning(f"PostgreSQL schema initialization notice: {e}")


async def sync_company_to_postgres(comp_data: dict, execs_list: list):
    """Sync company and executives to Neon PostgreSQL if connection is active."""
    global _pool
    if not _pool:
        return
    try:
        company_name = comp_data.get("company_name") or comp_data.get("name") or "N/A"
        company_email = comp_data.get("company_email") or comp_data.get("primary_email") or "N/A"
        company_phone = comp_data.get("company_phone") or comp_data.get("phone") or "N/A"
        address = comp_data.get("address") or comp_data.get("physical_address") or "N/A"
        city = comp_data.get("city") or "N/A"
        state = comp_data.get("state") or "N/A"
        pincode = comp_data.get("pincode") or "N/A"
        is_sub = bool(comp_data.get("is_subscribed", False))
        sub_status = "SUBSCRIBED" if is_sub else "NOT_SUBSCRIBED"

        async with _pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO companies (
                    id, country, city, state, pincode, address, company_name, company_email, sector, company_phone,
                    founder_name, founder_email, founder_phone, founder_title,
                    ceo_name, ceo_email, ceo_phone,
                    md_name, md_email, md_phone,
                    subscription_status, is_subscribed, subscription_tier, subscribed_at,
                    name, normalized_name, domain, physical_address, phone, primary_email,
                    executives_json, data_provenance, first_seen_at, last_seen_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14,
                    $15, $16, $17,
                    $18, $19, $20,
                    $21, $22, $23, $24,
                    $25, $26, $27, $28, $29, $30,
                    $31, $32, $33, $34
                ) ON CONFLICT (normalized_name) DO UPDATE SET
                    country = EXCLUDED.country,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    pincode = EXCLUDED.pincode,
                    address = EXCLUDED.address,
                    company_name = EXCLUDED.company_name,
                    last_seen_at = EXCLUDED.last_seen_at,
                    company_email = CASE WHEN companies.company_email = 'N/A' OR companies.company_email IS NULL THEN EXCLUDED.company_email ELSE companies.company_email END,
                    company_phone = CASE WHEN companies.company_phone = 'N/A' OR companies.company_phone IS NULL THEN EXCLUDED.company_phone ELSE companies.company_phone END,
                    physical_address = CASE WHEN companies.physical_address = 'N/A' THEN EXCLUDED.physical_address ELSE companies.physical_address END,
                    founder_name = CASE WHEN companies.founder_name = 'N/A' THEN EXCLUDED.founder_name ELSE companies.founder_name END,
                    founder_email = CASE WHEN companies.founder_email = 'N/A' THEN EXCLUDED.founder_email ELSE companies.founder_email END,
                    founder_phone = CASE WHEN companies.founder_phone = 'N/A' THEN EXCLUDED.founder_phone ELSE companies.founder_phone END,
                    ceo_name = CASE WHEN companies.ceo_name = 'N/A' THEN EXCLUDED.ceo_name ELSE companies.ceo_name END,
                    ceo_email = CASE WHEN companies.ceo_email = 'N/A' THEN EXCLUDED.ceo_email ELSE companies.ceo_email END,
                    ceo_phone = CASE WHEN companies.ceo_phone = 'N/A' THEN EXCLUDED.ceo_phone ELSE companies.ceo_phone END,
                    md_name = CASE WHEN companies.md_name = 'N/A' THEN EXCLUDED.md_name ELSE companies.md_name END,
                    md_email = CASE WHEN companies.md_email = 'N/A' THEN EXCLUDED.md_email ELSE companies.md_email END,
                    md_phone = CASE WHEN companies.md_phone = 'N/A' THEN EXCLUDED.md_phone ELSE companies.md_phone END;
            """,
                comp_data["id"], comp_data.get("country", "GLOBAL"), city, state, pincode, address,
                company_name, company_email, comp_data["sector"], company_phone,
                comp_data.get("founder_name", "N/A"), comp_data.get("founder_email", "N/A"), comp_data.get("founder_phone", "N/A"), comp_data.get("founder_title", "N/A"),
                comp_data.get("ceo_name", "N/A"), comp_data.get("ceo_email", "N/A"), comp_data.get("ceo_phone", "N/A"),
                comp_data.get("md_name", "N/A"), comp_data.get("md_email", "N/A"), comp_data.get("md_phone", "N/A"),
                sub_status, is_sub, comp_data.get("subscription_tier", "UNSUBSCRIBED"), comp_data.get("subscribed_at"),
                company_name, comp_data["normalized_name"], comp_data.get("domain", "N/A"), address,
                company_phone, company_email,
                comp_data.get("executives_json", "[]"), comp_data.get("data_provenance", "Website"),
                comp_data["first_seen_at"], comp_data["last_seen_at"]
            )

            for ex in execs_list:
                await conn.execute("""
                    INSERT INTO company_executives (
                        id, company_id, company_name, name, title, role_type,
                        email, phone, linkedin_url, provenance, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO NOTHING;
                """,
                    ex["id"], ex["company_id"], ex["company_name"], ex["name"], ex["title"],
                    ex.get("role_type", "EXECUTIVE"), ex.get("email", "N/A"), ex.get("phone", "N/A"),
                    ex.get("linkedin_url", "N/A"), ex.get("provenance", "Website"), ex.get("created_at", time.time())
                )
    except Exception as e:
        logger.debug(f"PostgreSQL company sync notice: {e}")


async def sync_subscription_to_postgres(company_id: str, is_subscribed: bool, subscription_tier: str):
    global _pool
    if not _pool:
        return
    try:
        now = time.time() if is_subscribed else None
        sub_status = "SUBSCRIBED" if is_subscribed else "NOT_SUBSCRIBED"
        async with _pool.acquire() as conn:
            await conn.execute("""
                UPDATE companies
                SET is_subscribed = $1, subscription_status = $2, subscription_tier = $3, subscribed_at = $4
                WHERE id = $5;
            """, is_subscribed, sub_status, subscription_tier, now, company_id)
    except Exception as e:
        logger.debug(f"PostgreSQL subscription sync notice: {e}")


async def sync_company_verification_to_postgres(company_id: str, trust_score: int, status: str, verified_at: float, report_json: str):
    """Sync company automated verification audit results to Neon PostgreSQL."""
    global _pool
    if not _pool:
        return
    try:
        async with _pool.acquire() as conn:
            await conn.execute("""
                UPDATE companies
                SET trust_score = $1,
                    verification_status = $2,
                    verified_at = $3,
                    verification_report_json = $4
                WHERE id = $5;
            """, trust_score, status, verified_at, report_json, company_id)
    except Exception as e:
        logger.debug(f"PostgreSQL verification sync notice: {e}")



if __name__ == "__main__":
    async def main():
        print("=" * 60)
        print("  Neon PostgreSQL Connectivity Diagnostic")
        print("=" * 60)
        
        url = get_database_url()
        if not url:
            print("\n[!] No NEON_DATABASE_URL or DATABASE_URL found in environment or .env.")
            print("\nPlease add your Neon connection string to .env:")
            print("  NEON_DATABASE_URL=postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require\n")
            sys.exit(1)

        masked_url = url
        if "@" in url:
            prefix, rest = url.split("@", 1)
            masked_url = "postgresql://****:****@" + rest
        print(f"\n[*] Target URL: {masked_url}")
        print("[*] Contacting Neon PostgreSQL server...")

        res = await check_connection()
        if res["connected"]:
            print("\n[+] SUCCESS: Connected to Neon PostgreSQL!")
            print(f"    - Database:    {res['database']}")
            print(f"    - User:        {res['user']}")
            print(f"    - Roundtrip:   {res['latency_ms']} ms")
            print(f"    - Server Time: {res['server_time']}")
            print(f"    - Version:     {res['version']}")
        else:
            print(f"\n[-] ERROR: Connection failed: {res.get('error')}")
            sys.exit(1)

        await close_pool()

    asyncio.run(main())
