"""
FastAPI REST API & Presentation Server for Extractor Engine
"""

import asyncio
from pathlib import Path
from typing import List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import OUTPUTS_DIR, BASE_DIR
from .models import ExtractorQuery, DossierResult
from .pipeline import ExtractorPipeline

STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="Guptchar Extractor Engine",
    description="Autonomous Commercial OSINT & Financial Regulatory Intelligence Pipeline",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/extract", response_model=DossierResult)
async def run_extraction(query: ExtractorQuery):
    """
    Executes Stage A (Discovery) -> Stage B (Deep Web) -> Stage C (SEC EDGAR) -> Exporters
    """
    try:
        pipeline = ExtractorPipeline()
        result = await asyncio.to_thread(pipeline.run, query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction pipeline failed: {str(e)}")


@app.get("/api/dossier/pdf/{filename}")
async def download_pdf(filename: str):
    """Serves generated ReportLab PDF dossiers."""
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists() or not filename.endswith(".pdf"):
        raise HTTPException(status_code=404, detail="Requested PDF dossier not found")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/pdf"
    )


@app.get("/api/dossier/json/{filename}")
async def download_json(filename: str):
    """Serves generated strict JSON dossiers."""
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists() or not filename.endswith(".json"):
        raise HTTPException(status_code=404, detail="Requested JSON dossier not found")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/json"
    )


@app.get("/api/outputs")
async def list_outputs():
    """Returns a list of all historical dossier files in the outputs directory."""
    files = []
    for p in OUTPUTS_DIR.glob("*.*"):
        if p.suffix in (".pdf", ".json"):
            files.append({
                "filename": p.name,
                "type": p.suffix[1:].upper(),
                "size_bytes": p.stat().st_size,
                "created_at": p.stat().st_ctime
            })
    return sorted(files, key=lambda x: x["created_at"], reverse=True)


# Serve Static Assets & Web Interface
if STATIC_DIR.exists():
    @app.get("/", response_class=HTMLResponse)
    async def get_index():
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return HTMLResponse("<h1>Extractor Engine Running</h1>")

    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
