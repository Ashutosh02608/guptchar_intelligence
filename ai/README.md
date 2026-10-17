# Guptchar AI - Regulatory Sector Impact Intelligence Engine

An autonomous AI engine built in `./ai` to analyze incoming financial regulatory circulars and announcements (from authorities such as **SEBI, RBI, US-SEC, UK-FCA, EU-ESMA**) and determine which **industry sectors will be economically, legally, or operationally impacted**.

---

## 🏗️ Architecture & Features

- **Multi-Provider LLM Tiering**:
  - **Google Gemini** (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`)
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`, or any custom base URL / vLLM / Groq)
  - **Anthropic Claude** (`claude-3-5-sonnet`, `claude-3-5-haiku`)
  - **Ollama / Local LLMs** (`llama3`, `mistral`, `qwen2.5`)
  - **Built-in Deterministic Heuristic Reasoner**: Runs offline out-of-the-box with **zero API keys or external dependencies required**, automatically upgrading to cloud LLMs when keys are provided!

- **11-Sector Regulatory Taxonomy**:
  1. `Banking & Lending` (Commercial banks, cooperative banks, liquidity windows)
  2. `NBFCs & Shadow Banking` (Upper-layer NBFCs, MFIs, Housing finance)
  3. `FinTech & Digital Payments` (Payment aggregators, UPI rails, digital wallets)
  4. `Asset Management & Mutual Funds` (AMCs, AIFs, PMS desks, ETFs)
  5. `Capital Markets, Brokers & Exchanges` (Stock exchanges, retail/algo brokers, depositories)
  6. `Insurance & Reinsurance` (Life/general insurers, underwriters, brokers)
  7. `Crypto, Web3 & Digital Assets` (VDA exchanges, custodians, token issuers)
  8. `Real Estate, Infrastructure & REITs` (REIT sponsors, infrastructure developers)
  9. `IT, Cloud Infrastructure & Cybersecurity` (FinTech SaaS, cloud vendors, security)
  10. `Derivatives, Forex & Commodities` (F&O desks, currency derivatives, treasury)
  11. `Corporate Governance & Cross-Industry` (Board composition, audit mandates, ESG/BRSR)

- **Structured Output Metrics**:
  - `overall_impact_score`: Float from 1.0 (routine filing) to 10.0 (seismic market intervention)
  - `primary_sector`: Core sector bearing the highest exposure
  - `impacted_sectors`: Array with individual impact score, directional bias (`BULLISH`, `BEARISH`, `INCREASED_COMPLIANCE`, `DISRUPTIVE`), severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), time horizon, and affected entity classes
  - `compliance_urgency`: `CRITICAL_IMMEDIATE`, `STANDARD_WINDOW`, or `INFORMATIONAL`
  - `executive_summary`: 2-3 sentence executive synopsis for Chief Risk Officers and Portfolio Managers

- **SQLite Cache & Deduplication Layer**:
  - Prevents redundant LLM calls on identical circulars via SHA-256 / announcement ID hashing in `./ai/analysis_cache.db`.

---

## 📁 Directory Structure (`./ai`)

```
ai/
├── __init__.py           # Package exports (analyzer, models, config)
├── config.py             # Environment configuration (.env & provider switcher)
├── models.py             # Pydantic data schemas (SectorImpact, AnnouncementAnalysis)
├── prompts.py            # Financial regulatory system & few-shot extraction prompts
├── llm_client.py         # Multi-provider client with resilient auto-fallback
├── heuristic_engine.py   # Domain-expert offline NLP & semantic rule reasoner
├── storage.py            # SQLite caching and telemetry distribution layer
├── analyzer.py           # Primary RegulatorySectorAnalyzer API
├── cli.py                # Command-line interface tool
└── README.md             # Technical documentation
```

---

## 🚀 Quickstart & Usage

### 1. Python API

```python
import asyncio
from ai import analyzer

async def main():
    announcement = {
        "title": "Master Circular on Algorithmic Trading Framework and Co-location Facilities",
        "authority": "SEBI",
        "jurisdiction": "IN",
        "summary": "Mandatory drop-copy audit trails and latency testing for brokers using NSE/BSE colocation racks."
    }

    # Analyzes and returns AnnouncementAnalysis object
    analysis = await analyzer.analyze(announcement)

    print(f"Primary Sector: {analysis.primary_sector.value}")
    print(f"Overall Impact: {analysis.overall_impact_score}/10")
    print(f"Urgency:        {analysis.compliance_urgency}")
    
    for sector_impact in analysis.impacted_sectors:
        print(f"-> {sector_impact.sector.value}: {sector_impact.directional_bias.value}")
        print(f"   Entities: {sector_impact.affected_entities}")

asyncio.run(main())
```

### 2. Command-Line Interface (CLI)

#### Analyze any announcement:
```bash
python ai/cli.py analyze "RBI increases risk weights on consumer loans to 125%" --authority RBI --jurisdiction IN
```

#### View sector impact analytics & frequencies:
```bash
python ai/cli.py stats
```

#### List recent stored analyses:
```bash
python ai/cli.py list --limit 10
```


---

## ⚙️ Configuration & API Keys (Optional)

Create a `./ai/.env` file or export environment variables:

```ini
# Provider: auto (default), gemini, openai, anthropic, ollama, or heuristic
AI_PROVIDER=auto

# Optional Cloud LLMs (if unset, offline Heuristic Reasoner runs automatically):
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=your_claude_api_key_here
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```
