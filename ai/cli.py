"""
CLI Tool for Guptchar AI Sector Analyzer.
Allows querying the analyzer for arbitrary text or viewing sector analytics from the command line.

Usage:
    python -m ai.cli analyze "SEBI mandates 100% margin on F&O contracts" --authority SEBI --jurisdiction IN
    python -m ai.cli stats
    python -m ai.cli list --limit 10
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Ensure workspace root in path
sys.path.insert(0, str(Path(__file__).parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from ai import analyzer


async def cmd_analyze(args):
    print(f"\nAnalyzing: '{args.text}' [{args.authority} - {args.jurisdiction}]...")
    res = await analyzer.analyze({
        "title": args.text,
        "authority": args.authority,
        "jurisdiction": args.jurisdiction,
        "summary": args.summary or ""
    })
    
    print("\n" + "=" * 60)
    print("ANALYSIS RESULT:")
    print("=" * 60)
    print(f"Primary Sector:   {res.primary_sector.value}")
    print(f"Impact Score:     {res.overall_impact_score}/10")
    print(f"Urgency:          {res.compliance_urgency}")
    print(f"Model Engine:     {res.model_provider_used} ({res.latency_ms} ms)")
    print(f"Executive Brief:  {res.executive_summary}")
    print("\nImpacted Sectors:")
    for s in res.impacted_sectors:
        print(f"  * {s.sector.value}: Score {s.impact_score} ({s.directional_bias.value})")
        if s.affected_entities:
            print(f"    Entities: {', '.join(s.affected_entities)}")


async def cmd_stats(args):
    telemetry = await analyzer.get_sector_telemetry()
    print("\n" + "=" * 60)
    print("SECTOR IMPACT DISTRIBUTION STATS:")
    print("=" * 60)
    print(f"Total Analyzed: {telemetry['total_analyzed']}")
    print(f"Most Impacted:  {telemetry['most_impacted_sector']}")
    print("\nBreakdown:")
    for k, v in telemetry['sector_frequency'].items():
        print(f"  {k.ljust(35)}: {v}")


async def cmd_list(args):
    analyses = await analyzer.get_recent_analyses(limit=args.limit)
    print(f"\nRecent {len(analyses)} Analyses:")
    for a in analyses:
        print(f"[{a.authority}] {a.title[:55]}... -> {a.primary_sector.value} (Score {a.overall_impact_score})")


def main():
    parser = argparse.ArgumentParser(description="Guptchar AI Regulatory Sector Impact Analyzer CLI")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # analyze command
    p_analyze = subparsers.add_parser("analyze", help="Analyze an announcement text")
    p_analyze.add_argument("text", help="Announcement headline or title")
    p_analyze.add_argument("--authority", default="SEBI", help="Regulatory Authority (SEBI, RBI, US-SEC, etc.)")
    p_analyze.add_argument("--jurisdiction", default="IN", help="Country/Jurisdiction (IN, US, UK, EU)")
    p_analyze.add_argument("--summary", default="", help="Optional description or directive details")

    # stats command
    subparsers.add_parser("stats", help="View sector impact distribution telemetry")

    # list command
    p_list = subparsers.add_parser("list", help="List recent stored analyses")
    p_list.add_argument("--limit", type=int, default=10, help="Number of records to show")

    args = parser.parse_args()
    if args.subcommand == "analyze":
        asyncio.run(cmd_analyze(args))
    elif args.subcommand == "stats":
        asyncio.run(cmd_stats(args))
    elif args.subcommand == "list":
        asyncio.run(cmd_list(args))


if __name__ == "__main__":
    main()
