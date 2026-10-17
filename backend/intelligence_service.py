"""
Autonomous Regulatory Intelligence Service
Bridges Regulatory Announcements -> Sector AI Analysis -> Extractor Engine -> Deduplication -> Tailored Email Generation for Outbox.
"""

import re
import json
import uuid
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional

from .models import RegulatoryUpdate, OutboxDispatch, ImpactedCompany
from .database import (
    save_or_update_impacted_company,
    add_outbox_dispatch,
    get_outbox_dispatches,
    get_outbox_counts
)
from ai.analyzer import RegulatorySectorAnalyzer
from ai.models import SectorCategory
from extractor.models import ExtractorQuery
from extractor.pipeline import ExtractorPipeline
from .email_templates import generate_email_dispatch

logger = logging.getLogger("Guptchar.IntelligenceService")

# Map of Sector Category to Extractor Search Queries
SECTOR_SEARCH_MAP = {
    SectorCategory.BANKING: "Commercial Banking",
    SectorCategory.NBFC: "Financial Services",
    SectorCategory.FINTECH: "Fintech Digital Payments",
    SectorCategory.ASSET_MANAGEMENT: "Asset Management & Hedge Funds",
    SectorCategory.CAPITAL_MARKETS: "Securities Brokers & Capital Markets",
    SectorCategory.INSURANCE: "Insurance & Reinsurance",
    SectorCategory.CRYPTO_DIGITAL_ASSETS: "Digital Assets & Crypto Trading",
    SectorCategory.REAL_ESTATE: "Real Estate Investment & REITs",
    SectorCategory.IT_CYBERSECURITY: "Financial Cloud Infrastructure & IT",
    SectorCategory.DERIVATIVES_FOREX: "Commodities & Forex Trading",
    SectorCategory.CORPORATE_GOVERNANCE: "Corporate Financial Advisory"
}

# Map Jurisdiction to Primary Hub City & Country
JURISDICTION_LOCATION_MAP = {
    "US": ("United States", "New York"),
    "UK": ("United Kingdom", "London"),
    "IN": ("India", "Mumbai"),
    "EU": ("Germany", "Frankfurt"),
    "GLOBAL": ("United States", "New York")
}


class AutonomousIntelligenceService:
    def __init__(self):
        self.analyzer = RegulatorySectorAnalyzer()
        self._ws_broadcaster = None

    def register_broadcaster(self, broadcaster_fn):
        self._ws_broadcaster = broadcaster_fn

    async def _broadcast(self, event_type: str, data: Any):
        if self._ws_broadcaster:
            try:
                await self._ws_broadcaster({"type": event_type, "timestamp": time.time(), "data": data})
            except Exception as e:
                logger.debug(f"Broadcaster notification notice: {e}")

    async def process_announcement(self, update: RegulatoryUpdate) -> List[OutboxDispatch]:
        """
        Orchestrates full autonomous pipeline when a new announcement arrives:
        1. AI Risk & Sector Evaluation
        2. Extractor Engine Discovery for impacted region & sector
        3. Information Quality Evaluation & Deduplication in DB
        4. Tailored Compliance Email Generation in Outbox (pending human review)
        """
        logger.info(f"🧠 [Intelligence Service] Ingesting announcement: [{update.board_name}] {update.title[:65]}...")

        # -------------------------------------------------------------
        # STEP 1: AI Risk, Sector & Region Evaluation
        # -------------------------------------------------------------
        analysis = await self.analyzer.analyze({
            "id": update.id,
            "title": update.title,
            "board_name": update.board_name,
            "jurisdiction": update.jurisdiction,
            "summary": update.summary or update.title,
            "url": update.url
        })

        # Primary Decision: If AI API key is provided and succeeded, AI is authoritative for severity & relevance
        from ai.llm_client import llm_client
        if llm_client.has_ai_api_key() and getattr(analysis, "model_provider_used", "heuristic") != "heuristic":
            if analysis.overall_severity and update.severity != analysis.overall_severity.value:
                ai_sev = analysis.overall_severity.value
                logger.info(f"🤖 [AI Decision] Authoritative AI evaluated severity as '{ai_sev}' (overriding heuristic '{update.severity}').")
                update.severity = ai_sev
                try:
                    from .postgres import get_pool
                    pool = await get_pool()
                    async with pool.acquire() as conn:
                        await conn.execute("UPDATE updates SET severity = $1 WHERE id = $2;", ai_sev, update.id)
                except Exception as e:
                    logger.debug(f"Could not sync AI severity to db: {e}")

            # AI decision: If impact score is negligible (<= 1/10), do not trigger mass dispatches
            if analysis.overall_impact_score <= 1:
                logger.info(f"🤖 [AI Decision] AI evaluated negligible market impact ({analysis.overall_impact_score}/10). Suppressing unsolicited outbound dispatches.")
                return []
        else:
            logger.info(f"🛡️ [Default Intelligence Active] Using default heuristic severity ('{update.severity}') and standard rules for [{update.board_name}].")

        primary_sector_enum = analysis.primary_sector
        sector_search_term = SECTOR_SEARCH_MAP.get(primary_sector_enum, primary_sector_enum.value)

        jurisdiction = update.jurisdiction.upper()
        country, city = JURISDICTION_LOCATION_MAP.get(jurisdiction, ("United States", "New York"))

        logger.info(
            f"🎯 [Intelligence Service] Target Identified: Sector='{sector_search_term}' "
            f"| Region='{city}, {country}' | Impact Score={analysis.overall_impact_score}/10"
        )

        # -------------------------------------------------------------
        # STEP 2: Trigger Extractor Engine for Impacted Companies
        # -------------------------------------------------------------
        extractor_query = ExtractorQuery(
            country=country,
            city=city,
            sector=sector_search_term,
            limit=20,
            check_sec=(jurisdiction == "US"),
            export_pdf=False,
            export_json=False
        )

        # Execute Extractor in worker thread to prevent blocking event loop
        try:
            logger.info("🔍 [Intelligence Service] Launching Extractor Engine for commercial entities...")
            pipeline = ExtractorPipeline()
            dossier_result = await asyncio.to_thread(pipeline.run, extractor_query)
            candidates = dossier_result.entities
            logger.info(f"🔍 [Intelligence Service] Extractor discovered {len(candidates)} candidates.")
        except Exception as e:
            logger.error(f"Extractor Engine execution encountered error: {e}")
            candidates = []

        if not candidates:
            logger.warning("No candidates returned by Extractor Engine.")
            return []

        # -------------------------------------------------------------
        # STEP 3: Quality Evaluation, Deduplication & Storage
        # -------------------------------------------------------------
        generated_dispatches: List[OutboxDispatch] = []

        for entity in candidates:
            # Quality Gate: Entity must have a recognizable name and either email or phone
            has_email = entity.primary_email != "N/A" and "@" in entity.primary_email
            has_phone = entity.gatekeeper_phone != "N/A"
            if not has_email and not has_phone:
                logger.info(f"⏭️ Skipping candidate '{entity.name}': Lacks actionable contact information.")
                continue

            # Normalized name for strict deduplication
            normalized_name = re.sub(r'[^a-z0-9]', '', entity.name.lower())
            if not normalized_name:
                continue

            # Extract domain
            domain = "N/A"
            if entity.website_url != "N/A":
                domain_match = re.search(r'https?://(?:www\.)?([^/]+)', entity.website_url)
                if domain_match:
                    domain = domain_match.group(1).lower()

            # Execs JSON
            execs_data = [ex.model_dump() for ex in entity.executives] if entity.executives else []
            execs_json = json.dumps(execs_data)

            # Deduplicate & Persist in DB with Leadership and Subscription tracking
            company, is_new = await save_or_update_impacted_company(
                company_id=f"comp_{normalized_name[:16]}_{uuid.uuid4().hex[:4]}",
                name=entity.name,
                normalized_name=normalized_name,
                domain=domain,
                sector=primary_sector_enum.value,
                city=city,
                country=country,
                physical_address=entity.physical_address,
                phone=entity.gatekeeper_phone,
                primary_email=entity.primary_email,
                executives_json=execs_json,
                data_provenance=entity.data_provenance,
                executives_list=execs_data
            )

            status_str = "NEW ENTITY STORED" if is_new else "EXISTING ENTITY UPDATED"
            logger.info(f"💾 [{status_str}] '{company.name}' ({company.primary_email})")

            # ---------------------------------------------------------
            # STEP 4: AI Email Generation for Outbox (Pending Human Review)
            # ---------------------------------------------------------
            # Target Recipient: Primary corporate email or first executive email
            recipient_email = company.primary_email
            if recipient_email == "N/A" and entity.executives:
                for ex in entity.executives:
                    if ex.email != "N/A" and "@" in ex.email:
                        recipient_email = ex.email
                        break
            if recipient_email == "N/A":
                recipient_email = f"compliance@{domain}" if domain != "N/A" else "compliance@targetcompany.internal"

            # STEP 4: Formulate Tailored Email based on Subscribed / Non-Subscribed Status
            email_subject, email_body = await generate_email_dispatch(
                company=company,
                update=update,
                executive_summary=analysis.executive_summary,
                compliance_urgency=analysis.compliance_urgency,
                impacted_sectors=analysis.impacted_sectors
            )

            sec_json = json.dumps([f.model_dump() for f in entity.sec_filings]) if entity.sec_filings else None

            is_sub = company.is_subscribed or (company.subscription_status == "SUBSCRIBED")

            # STRICT HUMAN APPROVAL GUARD: Dispatch status must ALWAYS initialize as PENDING_REVIEW
            # AI will never auto-transmit emails without human operator approval.
            dispatch = OutboxDispatch(
                id=f"disp_{uuid.uuid4().hex[:12]}",
                company_name=company.name,
                recipient_email=recipient_email,
                sector=primary_sector_enum.value,
                region=f"{city}, {country}",
                announcement_id=update.id,
                announcement_title=update.title,
                board_name=update.board_name,
                severity=update.severity,
                risk_summary=analysis.executive_summary,
                email_subject=email_subject,
                email_body=email_body.strip(),
                status="PENDING_REVIEW",
                executives_info=execs_json,
                sec_filing_info=sec_json,
                is_subscribed=is_sub,
                subscription_tier=company.subscription_tier or ("ACTIVE_SUBSCRIBER" if is_sub else "UNSUBSCRIBED"),
                template_type="SUBSCRIBED_VIP" if is_sub else "PROSPECT_EARLY_WARNING"
            )

            await add_outbox_dispatch(dispatch)
            generated_dispatches.append(dispatch)
            logger.info(f"📨 [Outbox Dispatch Created] For '{company.name}' -> Subject: '{email_subject[:50]}...'")

        # -------------------------------------------------------------
        # STEP 5: Real-Time WebSocket Synchronization
        # -------------------------------------------------------------
        if generated_dispatches:
            all_dispatches = await get_outbox_dispatches(limit=50)
            counts = await get_outbox_counts()
            await self._broadcast("OUTBOX_UPDATED", {
                "outbox": [d.model_dump() for d in all_dispatches],
                "counts": counts
            })
            await self._broadcast("ALERT_NEW_DISPATCH", {
                "count": len(generated_dispatches),
                "announcement_title": update.title,
                "companies": [d.company_name for d in generated_dispatches]
            })

        return generated_dispatches


intelligence_service = AutonomousIntelligenceService()
