"""
Extractor Pipeline Orchestrator
Coordinates Stage A (Discovery) -> Stage B (Enrichment) -> Stage C (SEC EDGAR) -> Export Engine
"""

import time
import logging
from typing import Callable, Optional

from .models import ExtractorQuery, DossierResult, EnrichedEntity
from .stage_a_discovery import run_stage_a
from .stage_b_enrichment import run_stage_b
from .stage_c_sec_edgar import run_stage_c
from .export_engine import JSONExporter, PDFExporter

logger = logging.getLogger("extractor.pipeline")


class ExtractorPipeline:
    def __init__(self, progress_callback: Optional[Callable[[str, int], None]] = None):
        """
        Optional progress_callback(step_name, percent_complete)
        for real-time streaming to CLI or WebSocket/FastAPI UI.
        """
        self.progress_callback = progress_callback

    def _notify(self, message: str, percent: int):
        logger.info(f"[{percent}%] {message}")
        if self.progress_callback:
            try:
                self.progress_callback(message, percent)
            except Exception:
                pass

    def run(self, query: ExtractorQuery) -> DossierResult:
        """Executes the end-to-end intelligence extraction pipeline."""
        start_time = time.perf_counter()
        self._notify(f"Initiating extraction for {query.sector} in {query.city}, {query.country}", 5)

        # -------------------------------------------------------------
        # STAGE A: Local Entity Discovery (Google Maps / Fallback)
        # -------------------------------------------------------------
        self._notify("STAGE A: Launching Local Entity Discovery (Google Maps Scraper with CDP masking)...", 15)
        raw_entities = run_stage_a(
            country=query.country,
            city=query.city,
            sector=query.sector,
            limit=query.limit
        )
        self._notify(f"STAGE A Complete: Discovered {len(raw_entities)} commercial candidates.", 35)

        # -------------------------------------------------------------
        # STAGE B: Deep Website Enrichment & Anti-Bot Evasion
        # -------------------------------------------------------------
        self._notify("STAGE B: Executing Deep Website Enrichment (curl_cffi JA3 + Cloudflare bypass)...", 45)
        enriched_entities = run_stage_b(raw_entities)
        self._notify("STAGE B Complete: Crawled subpages and extracted ranked contact profiles.", 70)

        # -------------------------------------------------------------
        # STAGE C: Financial Regulatory Filings Look-up (SEC EDGAR)
        # -------------------------------------------------------------
        if query.check_sec:
            self._notify("STAGE C: Checking SEC EDGAR REST API & Form D / ADV Related Persons...", 75)
            final_entities = run_stage_c(enriched_entities)
            self._notify("STAGE C Complete: Tagged official regulatory provenance.", 85)
        else:
            final_entities = enriched_entities

        # -------------------------------------------------------------
        # EXPORT ENGINE: JSON & PDF Exporters
        # -------------------------------------------------------------
        json_path = None
        pdf_path = None

        if query.export_json:
            self._notify("Generating strict JSON dossier schema...", 90)
            json_path = JSONExporter.export(final_entities, query)

        if query.export_pdf:
            self._notify("Rendering executive PDF dossier via ReportLab...", 95)
            pdf_path = PDFExporter.export(final_entities, query)

        elapsed = round(time.perf_counter() - start_time, 2)
        self._notify(f"Extraction Pipeline Complete in {elapsed}s! Total Entities: {len(final_entities)}", 100)

        return DossierResult(
            query=query,
            total_found=len(final_entities),
            entities=final_entities,
            json_path=json_path,
            pdf_path=pdf_path,
            execution_time_sec=elapsed,
            status="COMPLETED"
        )
