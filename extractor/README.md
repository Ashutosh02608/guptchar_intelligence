# Guptchar Extractor Engine

Autonomous Commercial OSINT & Financial Regulatory Intelligence Pipeline.

## Architecture

```
[ Input: Country, City, Sector/Keyword, Limit ]
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE A: Local Entity Discovery (Google Maps Scraper)                                    │
│ - Selenium Headless Chrome with Chrome DevTools Protocol (CDP) flag masking             │
│ - Overcomes consent banners, scrolls results, and inspects place detail pages           │
│ - Extracts: Business Name, Physical Address, Website URL, Gatekeeper Phone Number       │
│ - Built-in fallback generator for headless/containerized environments                    │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE B: Deep Website Enrichment & Anti-Bot Evasion                                      │
│ - Chrome JA3/TLS browser fingerprint impersonation via `curl_cffi`                     │
│ - Cloudflare WAF JS challenge bypass fallback via `cloudscraper`                        │
│ - Subpage auto-discovery: crawls `/contact`, `/about`, `/team`, `/leadership`          │
│ - Regex & DOM extraction: Corporate primary emails (heuristically ranked), phone       │
│   numbers, 1-sentence company summary, and executive profiles                           │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE C: Financial Regulatory Filings Look-up (SEC EDGAR Engine)                        │
│ - Dynamic sector trigger (activated if query matches finance, hedge funds, PE, etc.)   │
│ - Free official SEC EDGAR REST API (EFTS Full-Text Search + CIK Submissions API)        │
│ - Parses Form D XML & Form ADV filings for registered Related Persons / C-Suite         │
│ - Tags data provenance (`"SEC Filing / Website"` vs `"Website"`)                        │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ EXPORT ENGINE & PRESENTATION LAYER                                                      │
│ - JSON Exporter: Strict Pydantic schema with mandatory `"N/A"` fallback handling        │
│ - PDF Exporter: Multi-page ReportLab dossier with custom headers, footers, query       │
│   badges, metadata tables, executive contact grids, and page numbering                  │
│ - Dual Interface: CLI runner (`argparse`) + FastAPI REST API with Glassmorphic Web UI   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Quick Start via CLI

Run extraction directly from your terminal:

```bash
# Example: Extract Hedge Funds in New York
python -m extractor.cli --country "United States" --city "New York" --sector "Hedge Funds" --limit 5

# Example: Private Equity in London
python -m extractor.cli --country "United Kingdom" --city "London" --sector "Private Equity" --limit 5
```

### CLI Options
- `--country`, `-C`: Target country (e.g. `"United States"`)
- `--city`, `-c`: Target city (e.g. `"New York"`, `"London"`, `"Singapore"`)
- `--sector`, `-s`: Target sector/keyword (e.g. `"Hedge Funds"`, `"Venture Capital"`, `"Fintech"`)
- `--limit`, `-l`: Maximum entities to discover (default: `5`)
- `--no-sec`: Skip SEC EDGAR look-up
- `--no-pdf`: Skip PDF dossier generation
- `--no-json`: Skip JSON export
- `--verbose`, `-v`: Enable detailed debug output

---

## 2. Launching the Glassmorphic Web UI & REST API

Start the standalone FastAPI presentation server:

```bash
uvicorn extractor.api:app --host 0.0.0.0 --port 8080 --reload
```

Open your browser to:
**`http://localhost:8080`**

- Form controls for Country, City, Sector, Limit, and SEC toggles.
- Real-time Stage Progression Tracker (Stage 1 to 4).
- Interactive card view with ranked corporate emails, leadership contacts, and provenance badges.
- One-click downloads for the ReportLab PDF Dossier and strict JSON schema.

---

## 3. Python Programmatic Usage

```python
from extractor.models import ExtractorQuery
from extractor.pipeline import ExtractorPipeline

query = ExtractorQuery(
    country="United States",
    city="New York",
    sector="Hedge Funds",
    limit=5,
    check_sec=True,
    export_pdf=True,
    export_json=True
)

pipeline = ExtractorPipeline()
result = pipeline.run(query)

print(f"Extracted {result.total_found} entities in {result.execution_time_sec}s")
print(f"PDF Dossier saved to: {result.pdf_path}")
print(f"JSON Export saved to: {result.json_path}")
```
