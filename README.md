# Guptchar (गुप्तचर) 🛡️
### 24×7 Autonomous Regulatory Surveillance, Sector Risk AI & OSINT Intelligence Platform

> **Guptchar** continuously monitors global financial regulatory bodies (SEBI, RBI, SEC, FCA, ESMA), detects new circulars/announcements every 10 seconds, performs automated multi-sector risk assessment using LLMs, discovers impacted commercial entities via OSINT, and queues tailored advisory email dispatches with human-in-the-loop review.

---

## 🏗️ Architecture & Directory Structure

```
guptchar_1/
├── run_app.py                  # 🚀 Master single-command launcher (Backend + Frontend)
├── requirements.txt            # 📦 Unified Python dependencies (Backend, AI, Extractor)
├── package.json                # 📦 Root scripts & Neon DB bindings
├── .env.example                # 🔑 Complete environment variables template
├── .gitignore                  # 🛡️ Production-grade ignore rules (keys, caches, exports)
│
├── backend/                    # ⚙️ Unified FastAPI & 24*7 Surveillance Server (:8000)
│   ├── main.py                 # FastAPI application, REST endpoints & WebSocket streams
│   ├── engine.py               # 10s Surveillance sweep engine with delta watermarking
│   ├── scrapers.py             # Resilient feed scrapers with persistent HTTP connection pool
│   ├── intelligence_service.py # Autonomous pipeline: Alert -> AI Analysis -> OSINT Discovery -> Outbox
│   ├── verifier.py             # Multi-point company verification (DNS, SSL, Phone, SEC EDGAR)
│   ├── database.py             # High-level async data repository with smart deduplication
│   ├── postgres.py             # Neon Serverless PostgreSQL schema, pools & migrations
│   ├── models.py               # Pydantic domain models for boards, circulars & dispatches
│   └── run.py                  # Configurable Uvicorn ASGI entrypoint
│
├── ai/                         # 🧠 Sector Risk & Directional Bias Reasoner
│   ├── analyzer.py             # Public facade for circular risk assessment
│   ├── heuristic_engine.py     # Deterministic zero-cost fallback keyword/rule reasoner
│   ├── llm_client.py           # Unified multi-LLM client (Gemini, OpenAI, Claude, Ollama)
│   ├── prompts.py              # Structured regulatory risk evaluation prompts
│   ├── config.py               # AI module configuration & provider auto-detection
│   └── models.py               # Impact taxonomy (Severities, Horizons, Sector Biases)
│
├── extractor/                  # 🔍 Commercial Entity OSINT Engine (:8000/extractor)
│   ├── pipeline.py             # 3-Stage orchestrator: Discovery -> Enrichment -> SEC EDGAR
│   ├── stage_a_discovery.py    # Local entity & Google Maps search scraping
│   ├── stage_b_enrichment.py   # Multi-source web & executive leadership discovery
│   ├── stage_c_sec_edgar.py    # Official SEC EDGAR corporate filings validation
│   ├── export_engine.py        # Dossier generation (JSON & ReportLab PDF)
│   └── static/                 # Embedded OSINT standalone inspection interface
│
└── frontend/                   # 💻 Real-Time React 19 + Vite Dashboard (:5173)
    ├── src/
    │   ├── App.jsx             # Real-time WebSocket event orchestration & global state
    │   ├── pages/
    │   │   ├── CommandCenterPage.jsx # Executive oversight, system metrics & live stream
    │   │   ├── BoardsPage.jsx        # Regulatory authority latency & health matrix
    │   │   ├── UpdatesPage.jsx       # Real-time circulars feed & severity badges
    │   │   ├── OutboxPage.jsx        # Advisory email queue & batch approval workflow
    │   │   ├── CompaniesPage.jsx     # CRM entity directory & executive dossier manager
    │   │   ├── TelemetryPage.jsx     # Performance latency graph & network telemetry
    │   │   └── SettingsPage.jsx      # System configuration & database connectivity
    │   ├── components/               # High-fidelity glassmorphic tactical UI components
    │   └── utils/audio.js            # Synthesized Web Audio API tactical sound alerts
    └── package.json
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **Neon PostgreSQL Database** (Free serverless account at [neon.tech](https://neon.tech))

### 2. Configure Environment
Copy `.env.example` to `.env` and provide your credentials:
```bash
cp .env.example .env
```
Add your Neon connection URL:
```ini
NEON_DATABASE_URL=postgresql://neondb_owner:your_password@ep-xxxx.neon.tech/neondb?sslmode=require
```

### 3. Install Dependencies
```bash
# Python dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 4. Run Everything in One Terminal
```bash
python run_app.py
```
Or with `npm`:
```bash
npm start
```

* **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
* **Unified API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **OSINT Extractor Interface**: [http://127.0.0.1:8000/extractor](http://127.0.0.1:8000/extractor)

---

## 🛡️ Key Features

1. **24×7 10-Second Regulatory Surveillance Engine**:
   - Monitored boards: RBI, SEBI, SEC, FCA, ESMA.
   - Sub-second feed sweeps using persistent HTTP/2 connection pooling with SHA-256 watermarking.
2. **Autonomous Multi-LLM Impact Evaluation**:
   - Evaluates directional bias (Bearish/Bullish/Neutral), severity (Critical/High/Medium/Low), and affected sectors.
   - Resilient multi-provider support: Google Gemini, OpenAI, Anthropic, Ollama, with automated zero-cost heuristic fallback.
3. **Smart Cloud Deduplication & CRM Enrichment**:
   - Deduplicated commercial records keyed by `normalized_name`.
   - Batch executive fetching eliminating N+1 database queries.
   - Selective in-place data enrichment without overwriting verified fields.
4. **Human-in-the-Loop Advisory Outbox**:
   - Auto-generates tailored regulatory advisory emails for affected companies.
   - Single-click and bulk review, edit, and dispatch.
