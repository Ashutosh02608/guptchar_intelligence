import asyncio
import time
import uuid
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Header
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from extractor.config import OUTPUTS_DIR, BASE_DIR as EXTRACTOR_BASE_DIR
from extractor.models import ExtractorQuery, DossierResult
from extractor.pipeline import ExtractorPipeline

from .models import (
    RegulatoryBoard, RegulatoryUpdate, SystemStats,
    AddBoardRequest, OutboxDispatch, UpdateDispatchRequest,
    ImpactedCompany, UpdateSubscriptionRequest, UpdateCompanyRequest,
    CompanyVerificationReport, LoginRequest
)
from .database import (
    init_db, get_all_boards, add_custom_board,
    toggle_board_enabled, get_updates, mark_update_read,
    mark_all_updates_read, get_telemetry_logs, delete_board,
    get_outbox_dispatches, get_outbox_dispatch_by_id,
    update_outbox_dispatch, approve_and_send_dispatch,
    reject_dispatch, batch_send_all_pending,
    delete_outbox_dispatch, clear_outbox_dispatches,
    get_outbox_counts, get_all_impacted_companies,
    get_companies_count,
    get_company_by_id, update_company_subscription,
    update_company_profile, save_company_verification
)
from .postgres import (
    close_pool as close_pg_pool,
    check_connection as check_pg_connection
)
from .engine import monitoring_engine
from .intelligence_service import intelligence_service
from .verifier import company_verifier
from .smtp_service import smtp_service
from .auth_service import auth_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Neon PostgreSQL tables, connection pool, and start surveillance monitoring
    await init_db()
    await monitoring_engine.start()
    yield
    # Shutdown
    await monitoring_engine.stop()
    await close_pg_pool()

app = FastAPI(
    title="Guptchar - 24*7 Regulatory Surveillance & Intelligence Engine",
    description="Real-time 10-second monitoring engine with autonomous AI impact assessment, company extraction, and human-in-the-loop outbox dispatch.",
    version="1.2.0",
    lifespan=lifespan
)

# Enable CORS for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_connections: List[WebSocket] = []

async def ws_broadcast_handler(message: dict):
    for ws in list(active_connections):
        try:
            await ws.send_json(message)
        except Exception:
            if ws in active_connections:
                active_connections.remove(ws)

# Register engine & intelligence service listeners to forward ticks, alerts & outbox updates
monitoring_engine.register_listener(ws_broadcast_handler)
intelligence_service.register_broadcaster(ws_broadcast_handler)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial state snapshot on connection
        stats = await monitoring_engine.get_stats()
        boards = await get_all_boards()
        recent_updates = await get_updates(limit=25)
        outbox_items = await get_outbox_dispatches(limit=50)
        outbox_counts = await get_outbox_counts()
        
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "timestamp": time.time(),
            "data": {
                "stats": stats.dict(),
                "boards": [b.dict() for b in boards],
                "updates": [u.dict() for u in recent_updates],
                "outbox": [d.dict() for d in outbox_items],
                "outbox_counts": outbox_counts
            }
        })
        
        while True:
            # Keep-alive or handle client messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

@app.get("/api/health")
async def health_check():
    return {"status": "ONLINE", "service": "Guptchar Intelligence", "timestamp": time.time()}

# --- AUTHENTICATION & ACCESS CONTROL ENDPOINTS ---

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """Authenticate operator against Neon PostgreSQL for full system access."""
    user = await auth_service.verify_credentials(req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password. Please verify your credentials."
        )
    token = auth_service.create_token(user)
    return {
        "status": "SUCCESS",
        "token": token,
        "user": user
    }

@app.get("/api/auth/verify")
async def verify_auth(token: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    """Validates session token and returns current user credentials."""
    raw_token = token
    if not raw_token and authorization:
        if authorization.startswith("Bearer "):
            raw_token = authorization.split(" ")[1]
        else:
            raw_token = authorization

    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication token missing")

    payload = auth_service.verify_token(raw_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired or invalid token")

    return {
        "status": "VALID",
        "user": {
            "id": payload.get("sub"),
            "username": payload.get("username"),
            "email": payload.get("email"),
            "name": payload.get("name"),
            "role": payload.get("role"),
            "access_level": payload.get("access_level")
        }
    }

@app.post("/api/auth/logout")
async def logout():
    """Confirms user logout."""
    return {"status": "SUCCESS", "message": "Successfully logged out."}


@app.get("/api/status", response_model=SystemStats)
async def get_system_status():
    return await monitoring_engine.get_stats()

@app.get("/api/boards", response_model=List[RegulatoryBoard])
async def list_regulatory_boards():
    return await get_all_boards()

@app.post("/api/boards", response_model=RegulatoryBoard)
async def create_board(req: AddBoardRequest):
    board_id = req.short_code.lower().replace("-", "_").replace(" ", "_") + "_" + uuid.uuid4().hex[:4]
    new_board = RegulatoryBoard(
        id=board_id,
        name=req.name,
        short_code=req.short_code,
        jurisdiction=req.jurisdiction.upper(),
        category=req.category,
        website_url=req.website_url,
        feed_url=req.feed_url,
        poll_interval_sec=req.poll_interval_sec,
        enabled=True,
        last_status="PENDING"
    )
    await add_custom_board(new_board)
    boards = await get_all_boards()
    await monitoring_engine.broadcast("BOARDS_UPDATED", {"boards": [b.dict() for b in boards]})
    return new_board

@app.patch("/api/boards/{board_id}/toggle")
async def toggle_board(board_id: str, enabled: bool = Query(...)):
    await toggle_board_enabled(board_id, enabled)
    boards = await get_all_boards()
    await monitoring_engine.broadcast("BOARDS_UPDATED", {"boards": [b.dict() for b in boards]})
    return {"status": "SUCCESS", "board_id": board_id, "enabled": enabled}

@app.get("/api/updates", response_model=List[RegulatoryUpdate])
async def list_updates(
    limit: int = Query(50, ge=1, le=200),
    board_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None)
):
    return await get_updates(limit=limit, board_id=board_id, severity=severity)

@app.post("/api/updates/{update_id}/read")
async def mark_read(update_id: str):
    await mark_update_read(update_id)
    return {"status": "SUCCESS", "id": update_id}

@app.post("/api/updates/mark-all-read")
async def mark_all_read():
    await mark_all_updates_read()
    return {"status": "SUCCESS"}

@app.post("/api/reset-feed")
async def reset_feed():
    """Wipes past updates so the feed only contains newly detected releases from this moment forward."""
    await monitoring_engine.reset_feed_baseline()
    return {"status": "SUCCESS", "message": "Watermark baseline reset. Monitoring strictly for new releases."}

@app.post("/api/trigger-sweep")
async def trigger_sweep():
    """Forces an immediate 10s monitoring sweep across all boards."""
    asyncio.create_task(monitoring_engine.run_monitoring_cycle())
    return {"status": "TRIGGERED", "message": "Manual regulatory sweep initiated"}

@app.get("/api/telemetry")
async def list_telemetry(limit: int = Query(100, ge=1, le=500)):
    """Returns recent real-time probe telemetry audit logs."""
    return await get_telemetry_logs(limit=limit)

@app.delete("/api/boards/{board_id}")
async def remove_board(board_id: str):
    """Deletes a custom regulatory board from surveillance."""
    await delete_board(board_id)
    boards = await get_all_boards()
    await monitoring_engine.broadcast("BOARDS_UPDATED", {"boards": [b.dict() for b in boards]})
    return {"status": "DELETED", "board_id": board_id}

@app.get("/api/db/status")
async def get_neon_database_status():
    """Checks and returns Neon PostgreSQL connectivity status, latency, and server info."""
    return await check_pg_connection()

# ==============================================================================
# OUTBOX DISPATCHES & HUMAN-IN-THE-LOOP REVIEW ENDPOINTS
# ==============================================================================

@app.get("/api/outbox", response_model=List[OutboxDispatch])
async def list_outbox_dispatches(
    status: Optional[str] = Query(None, description="Filter by status: PENDING_REVIEW, SENT, REJECTED, or ALL"),
    limit: int = Query(100, ge=1, le=300)
):
    """Retrieves all generated company advisory emails for human review."""
    return await get_outbox_dispatches(status=status, limit=limit)

@app.get("/api/outbox/counts")
async def get_outbox_statistics():
    """Returns summary count metrics (total, pending, sent, rejected)."""
    return await get_outbox_counts()

@app.get("/api/outbox/{dispatch_id}", response_model=OutboxDispatch)
async def get_single_dispatch(dispatch_id: str):
    dispatch = await get_outbox_dispatch_by_id(dispatch_id)
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return dispatch

@app.patch("/api/outbox/{dispatch_id}", response_model=OutboxDispatch)
async def update_dispatch_content(dispatch_id: str, req: UpdateDispatchRequest):
    """Allows a human reviewer to modify recipient, subject, body, or status."""
    updated = await update_outbox_dispatch(dispatch_id, req.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    # Broadcast outbox updated
    outbox = await get_outbox_dispatches(limit=50)
    counts = await get_outbox_counts()
    await monitoring_engine.broadcast("OUTBOX_UPDATED", {
        "outbox": [d.dict() for d in outbox],
        "counts": counts
    })
    return updated

@app.post("/api/outbox/{dispatch_id}/approve", response_model=OutboxDispatch)
async def approve_dispatch(dispatch_id: str):
    """Human reviewer approves and dispatches the advisory email via SMTP."""
    dispatch = await get_outbox_dispatch_by_id(dispatch_id)
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    # Send the email via SMTP service
    success, message = await smtp_service.send_email(
        to_email=dispatch.recipient_email,
        subject=dispatch.email_subject,
        body_html=dispatch.email_body
    )
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"SMTP Dispatch Error: {message}. Check SMTP configuration in .env."
        )

    sent = await approve_and_send_dispatch(dispatch_id)
    outbox = await get_outbox_dispatches(limit=50)
    counts = await get_outbox_counts()
    await monitoring_engine.broadcast("OUTBOX_UPDATED", {
        "outbox": [d.dict() for d in outbox],
        "counts": counts
    })
    return sent

@app.post("/api/outbox/{dispatch_id}/reject", response_model=OutboxDispatch)
async def reject_dispatch_review(dispatch_id: str):
    """Human reviewer discards/rejects the advisory email."""
    rejected = await reject_dispatch(dispatch_id)
    if not rejected:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    outbox = await get_outbox_dispatches(limit=50)
    counts = await get_outbox_counts()
    await monitoring_engine.broadcast("OUTBOX_UPDATED", {
        "outbox": [d.dict() for d in outbox],
        "counts": counts
    })
    return rejected

@app.post("/api/outbox/batch-send")
async def send_all_pending_dispatches():
    """Approves and dispatches all pending reviews in one action via SMTP."""
    pending = await get_outbox_dispatches(status="PENDING_REVIEW", limit=100)
    dispatched_count = 0
    errors = []

    for d in pending:
        success, message = await smtp_service.send_email(
            to_email=d.recipient_email,
            subject=d.email_subject,
            body_html=d.email_body
        )
        if success:
            await approve_and_send_dispatch(d.id)
            dispatched_count += 1
        else:
            errors.append(f"{d.company_name} ({d.recipient_email}): {message}")

    outbox = await get_outbox_dispatches(limit=50)
    counts = await get_outbox_counts()
    await monitoring_engine.broadcast("OUTBOX_UPDATED", {
        "outbox": [d.dict() for d in outbox],
        "counts": counts
    })
    return {
        "status": "SUCCESS" if not errors else ("PARTIAL" if dispatched_count > 0 else "ERROR"),
        "dispatched_count": dispatched_count,
        "errors": errors
    }

@app.get("/api/smtp/status")
async def get_smtp_status():
    """Get current SMTP configuration status (with masked credentials)."""
    return smtp_service.get_status()

@app.delete("/api/outbox/{dispatch_id}")
async def remove_dispatch(dispatch_id: str):
    success = await delete_outbox_dispatch(dispatch_id)
    outbox = await get_outbox_dispatches(limit=50)
    counts = await get_outbox_counts()
    await monitoring_engine.broadcast("OUTBOX_UPDATED", {
        "outbox": [d.dict() for d in outbox],
        "counts": counts
    })
    return {"status": "DELETED", "id": dispatch_id}

@app.delete("/api/outbox")
async def clear_all_dispatches():
    await clear_outbox_dispatches()
    counts = await get_outbox_counts()
    await monitoring_engine.broadcast("OUTBOX_UPDATED", {
        "outbox": [],
        "counts": counts
    })
    return {"status": "CLEARED"}

# ==============================================================================
# DEDUPLICATED IMPACTED COMPANIES & CRM LEADERSHIP
# ==============================================================================

@app.get("/api/companies/count")
async def get_total_companies_count():
    """Returns total count of discovered companies without loading payload."""
    count = await get_companies_count()
    return {"count": count}

@app.get("/api/companies", response_model=List[ImpactedCompany])
async def list_impacted_companies(
    country: Optional[str] = Query(None, description="Filter by Country"),
    is_subscribed: Optional[bool] = Query(None, description="Filter by subscription status (true/false)"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    limit: int = Query(100, ge=1, le=500)
):
    """Returns deduplicated commercial entities with executive leadership (Founder/CEO/MD), address, city, state, pincode, and subscription status."""
    return await get_all_impacted_companies(country=country, is_subscribed=is_subscribed, sector=sector, limit=limit)

@app.get("/api/companies/{company_id}", response_model=ImpactedCompany)
async def get_company_details(company_id: str):
    """Fetches full dossier for a company including verified officers and subscription details."""
    comp = await get_company_by_id(company_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    return comp

@app.patch("/api/companies/{company_id}/subscription", response_model=ImpactedCompany)
async def modify_company_subscription(company_id: str, payload: UpdateSubscriptionRequest):
    """
    Updates whether a company has subscribed or not subscribed to the intelligence service.
    Persists locally and syncs to Neon PostgreSQL.
    """
    updated = await update_company_subscription(
        company_id=company_id,
        is_subscribed=payload.is_subscribed,
        subscription_tier=payload.subscription_tier or ("ACTIVE_SUBSCRIBER" if payload.is_subscribed else "UNSUBSCRIBED")
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Broadcast subscription update over WebSocket
    await monitoring_engine.broadcast("COMPANY_SUBSCRIPTION_UPDATED", {
        "company_id": updated.id,
        "name": updated.name,
        "is_subscribed": updated.is_subscribed,
        "subscription_tier": updated.subscription_tier,
        "subscribed_at": updated.subscribed_at
    })
    return updated

@app.put("/api/companies/{company_id}", response_model=ImpactedCompany)
async def update_company_full_profile(company_id: str, payload: UpdateCompanyRequest):
    """
    Updates full company attributes including country, city, state, pincode, physical address,
    domain, company contact, and leadership (Founder, CEO, MD + phone & email).
    Persists to SQLite and syncs live to Neon PostgreSQL.
    """
    updates_dict = payload.model_dump(exclude_unset=True)
    updated = await update_company_profile(company_id=company_id, updates=updates_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Company not found")

    await monitoring_engine.broadcast("COMPANY_PROFILE_UPDATED", {
        "company_id": updated.id,
        "name": updated.name,
        "country": updated.country,
        "city": updated.city,
        "state": updated.state,
        "pincode": updated.pincode,
        "is_subscribed": updated.is_subscribed
    })
    return updated

@app.post("/api/companies/{company_id}/verify", response_model=CompanyVerificationReport)
async def verify_company_authenticity(company_id: str):
    """
    Executes live multi-point verification on company web domain, SSL liveness,
    email domain MX DNS routing, phone routing format, physical address PIN,
    and SEC EDGAR regulatory corporate registry search.
    Persists trust score and audit report locally and syncs to Neon PostgreSQL.
    """
    import json
    company = await get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    report = await company_verifier.verify(company.model_dump())

    # Map trust score to status
    if report.trust_score >= 80:
        status = "VERIFIED"
    elif report.trust_score >= 50:
        status = "PARTIALLY_VERIFIED"
    else:
        status = "FLAGGED"

    report_json = json.dumps(report.model_dump())

    await save_company_verification(
        company_id=company_id,
        trust_score=report.trust_score,
        verification_status=status,
        verified_at=report.verified_at,
        verification_report_json=report_json
    )

    # Broadcast verification result over WebSocket
    await monitoring_engine.broadcast("COMPANY_VERIFIED", {
        "company_id": company_id,
        "name": company.name,
        "trust_score": report.trust_score,
        "confidence_level": report.confidence_level,
        "verification_status": status,
        "verified_at": report.verified_at,
        "report": report.model_dump()
    })

    return report

@app.get("/api/companies/{company_id}/verification-report")
async def get_company_verification_report(company_id: str):
    """Retrieves existing verification audit report for a company."""
    import json
    company = await get_company_by_id(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company.verification_report_json and company.verification_report_json != "{}":
        try:
            return json.loads(company.verification_report_json)
        except Exception:
            pass

    return {
        "company_id": company.id,
        "company_name": company.name,
        "trust_score": company.trust_score or 0,
        "confidence_level": "UNVERIFIED",
        "verified_at": company.verified_at,
        "checks": [],
        "registry_match": None,
        "summary": "No audit has been performed yet for this entity. Click 'Verify Authenticity' to run live multi-point verification."
    }

# ==============================================================================
# ON-DEMAND AI EVALUATION TRIGGER
# ==============================================================================

@app.post("/api/intelligence/evaluate-announcement/{update_id}")
async def evaluate_announcement_manually(update_id: str):
    """
    On-demand trigger: Evaluates risk for an existing announcement, runs Extractor Engine,
    deduplicates companies, and generates tailored Outbox advisory emails.
    """
    updates = await get_updates(limit=100)
    matching = [u for u in updates if u.id == update_id]
    if not matching:
        raise HTTPException(status_code=404, detail=f"Announcement '{update_id}' not found.")
    
    update = matching[0]
    # Run pipeline asynchronously and return confirmation
    asyncio.create_task(intelligence_service.process_announcement(update))
    return {
        "status": "PROCESSING",
        "announcement_id": update_id,
        "title": update.title,
        "message": "AI risk evaluation, entity extraction, deduplication, and Outbox email generation initiated in background."
    }

# ==============================================================================
# UNIFIED OSINT EXTRACTOR ENGINE & DOSSIER REPOSITORY
# ==============================================================================

@app.post("/api/extract", response_model=DossierResult)
async def run_extraction_api(query: ExtractorQuery):
    """
    Executes Stage A (Discovery) -> Stage B (Deep Web) -> Stage C (SEC EDGAR) -> Exporters.
    Runs in-memory on the unified backend.
    """
    try:
        pipeline = ExtractorPipeline()
        result = pipeline.run(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction pipeline failed: {str(e)}")

@app.get("/api/dossier/pdf/{filename}")
async def download_dossier_pdf(filename: str):
    """Serves generated ReportLab PDF dossiers."""
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists() or not filename.endswith(".pdf"):
        raise HTTPException(status_code=404, detail="Requested PDF dossier not found")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/pdf")

@app.get("/api/dossier/json/{filename}")
async def download_dossier_json(filename: str):
    """Serves generated strict JSON dossiers."""
    file_path = OUTPUTS_DIR / filename
    if not file_path.exists() or not filename.endswith(".json"):
        raise HTTPException(status_code=404, detail="Requested JSON dossier not found")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/json")

@app.get("/api/outputs")
async def list_dossier_outputs():
    """Returns a list of all historical dossier files in the outputs directory."""
    files = []
    if OUTPUTS_DIR.exists():
        for p in OUTPUTS_DIR.glob("*.*"):
            if p.suffix in (".pdf", ".json"):
                files.append({
                    "filename": p.name,
                    "type": p.suffix[1:].upper(),
                    "size_bytes": p.stat().st_size,
                    "created_at": p.stat().st_ctime
                })
    return sorted(files, key=lambda x: x["created_at"], reverse=True)

# Standalone Extractor Presentation Interface
EXTRACTOR_STATIC = EXTRACTOR_BASE_DIR / "static"
if EXTRACTOR_STATIC.exists():
    @app.get("/extractor", response_class=HTMLResponse)
    @app.get("/extractor/", response_class=HTMLResponse)
    async def get_extractor_ui():
        index_file = EXTRACTOR_STATIC / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return HTMLResponse("<h1>Extractor Engine Running</h1>")

