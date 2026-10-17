"""
CLI Runner for Extractor Engine
Usage:
    python -m extractor.cli --country "United States" --city "New York" --sector "Hedge Funds" --limit 5
"""

import sys
import argparse
import logging

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from .models import ExtractorQuery
from .pipeline import ExtractorPipeline

BANNER = """
============================================================================
    GUPTCHAR EXTRACTOR ENGINE -- AUTONOMOUS COMMERCIAL OSINT RADAR       
    Stage A (Google Maps) -> Stage B (Deep Web) -> Stage C (SEC EDGAR)      
============================================================================
"""


def main():
    parser = argparse.ArgumentParser(
        description="Autonomous Entity & Executive Intelligence Extraction Engine"
    )
    parser.add_argument(
        "--country", "-C",
        type=str,
        default="United States",
        help="Target country name (default: 'United States')"
    )
    parser.add_argument(
        "--city", "-c",
        type=str,
        default="New York",
        help="Target city name (default: 'New York')"
    )
    parser.add_argument(
        "--sector", "-s",
        type=str,
        default="Hedge Funds",
        help="Target sector or keyword (e.g. 'Private Equity', 'Venture Capital', 'Fintech')"
    )
    parser.add_argument(
        "--limit", "-l",
        type=int,
        default=5,
        help="Maximum entities to discover and enrich (default: 5)"
    )
    parser.add_argument(
        "--no-sec",
        action="store_true",
        help="Disable automatic SEC EDGAR filings lookup"
    )
    parser.add_argument(
        "--no-pdf",
        action="store_true",
        help="Disable ReportLab PDF dossier generation"
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Disable JSON export"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable detailed debug logs"
    )

    args = parser.parse_args()

    # Configure logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S"
    )

    print(BANNER)
    print(f"[*] Target Location:  {args.city}, {args.country}")
    print(f"[*] Target Sector:    {args.sector}")
    print(f"[*] Entity Limit:     {args.limit}")
    print(f"[*] SEC Look-up:      {'DISABLED' if args.no_sec else 'ENABLED (EFTS + CIK API)'}")
    print("=" * 76)

    query = ExtractorQuery(
        country=args.country,
        city=args.city,
        sector=args.sector,
        limit=args.limit,
        check_sec=not args.no_sec,
        export_pdf=not args.no_pdf,
        export_json=not args.no_json
    )

    def print_progress(msg: str, pct: int):
        bar_len = 28
        filled = int(bar_len * (pct / 100))
        bar = "#" * filled + "-" * (bar_len - filled)
        print(f"\r  [{bar}] {pct:3d}% | {msg[:50]:<50}", end="", flush=True)
        if pct == 100:
            print()

    pipeline = ExtractorPipeline(progress_callback=print_progress)
    result = pipeline.run(query)

    print("\n" + "=" * 76)
    print(f"  EXTRACTION COMPLETE: Discovered {result.total_found} Entities in {result.execution_time_sec}s")
    print("=" * 76)

    for i, ent in enumerate(result.entities, 1):
        print(f"\n[{i}] {ent.name}  <{ent.data_provenance}>")
        print(f"    * Physical Address: {ent.physical_address}")
        print(f"    * Primary Email:    {ent.primary_email}")
        print(f"    * Gatekeeper Phone: {ent.gatekeeper_phone}")
        print(f"    * Website:          {ent.website_url}")
        if ent.executives:
            print(f"    * Key Leadership ({len(ent.executives)} on record):")
            for ex in ent.executives[:3]:
                print(f"        - {ex.name} ({ex.title}) [{ex.provenance}] | {ex.email}")
        if ent.sec_filings:
            print(f"    * SEC Filings: {len(ent.sec_filings)} forms (CIK: {ent.sec_filings[0].cik})")

    print("\n" + "-" * 76)
    if result.json_path:
        print(f"  [+] JSON Dossier: {result.json_path}")
    if result.pdf_path:
        print(f"  [+] PDF Dossier:  {result.pdf_path}")
    print("-" * 76 + "\n")


if __name__ == "__main__":
    main()
