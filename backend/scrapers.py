import asyncio
import hashlib
import time
import re
from typing import List, Tuple, Optional
import httpx
import feedparser
from bs4 import BeautifulSoup
from .models import RegulatoryBoard, RegulatoryUpdate

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (Guptchar Regulatory Surveillance 1.0; +https://guptchar.local)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}

CRITICAL_KEYWORDS = [
    "ban", "suspension", "emergency", "monetary policy", "repo rate", "halt",
    "enforcement order", "debar", "freeze", "insolvency", "sanction", "cease and desist",
    "revocation", "market manipulation", "crypto ban"
]

HIGH_KEYWORDS = [
    "penalty", "amendment", "circular", "mandate", "guidelines", "compliance",
    "deadline", "cybersecurity", "insider trading", "margin requirement", "fining",
    "investigation", "surveillance", "disclosure"
]

MEDIUM_KEYWORDS = [
    "consultation", "advisory", "framework", "discussion paper", "standard",
    "licensing", "operational guidelines", "quarterly review", "technical standard"
]

def analyze_severity_and_category(title: str, summary: str = "") -> Tuple[str, str]:
    text = (title + " " + (summary or "")).lower()
    
    # Severity
    severity = "INFO"
    for kw in CRITICAL_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', text):
            severity = "CRITICAL"
            break
            
    if severity != "CRITICAL":
        for kw in HIGH_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                severity = "HIGH"
                break
                
    if severity not in ["CRITICAL", "HIGH"]:
        for kw in MEDIUM_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                severity = "MEDIUM"
                break

    # Category
    category = "Circular"
    if any(w in text for w in ["fine", "penalty", "enforcement", "order", "debar", "fraud", "action"]):
        category = "Enforcement"
    elif any(w in text for w in ["repo", "rate", "monetary", "inflation", "liquidity", "policy"]):
        category = "Monetary Policy"
    elif any(w in text for w in ["consultation", "feedback", "draft", "discussion"]):
        category = "Consultation"
    elif any(w in text for w in ["warning", "caution", "alert", "scam"]):
        category = "Warning"
    elif any(w in text for w in ["framework", "rule", "standard", "regulation"]):
        category = "Regulation"
        
    return severity, category

def generate_update_hash(board_id: str, title: str, link: str) -> str:
    # Strictly deterministic hash based on board, title, and link only (no dynamic timestamp)
    raw = f"{board_id.strip().lower()}::{title.strip().lower()}::{link.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

_shared_scraper_client: Optional[httpx.AsyncClient] = None

def get_shared_scraper_client() -> httpx.AsyncClient:
    global _shared_scraper_client
    if _shared_scraper_client is None or _shared_scraper_client.is_closed:
        _shared_scraper_client = httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers=HEADERS,
            verify=False,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=40, keepalive_expiry=60.0)
        )
    return _shared_scraper_client

async def fetch_board_feed(board: RegulatoryBoard) -> Tuple[str, float, List[RegulatoryUpdate], Optional[str]]:
    """
    Fetches the board's feed or announcements page with connection reuse.
    Returns (status, latency_ms, latest_releases, error_msg).
    Status: 'HEALTHY', 'DEGRADED', 'ERROR'.
    """
    start_time = time.time()
    updates: List[RegulatoryUpdate] = []
    
    try:
        client = get_shared_scraper_client()
        resp = await client.get(board.feed_url)
        latency_ms = round((time.time() - start_time) * 1000, 1)
        
        if resp.status_code >= 400:
            site_resp = await client.get(board.website_url)
            if site_resp.status_code < 400:
                return "DEGRADED", latency_ms, updates, f"Feed returned HTTP {resp.status_code}, portal online"
            return "ERROR", latency_ms, updates, f"HTTP error {resp.status_code}"
            
        content = resp.text
        
        # If RSS / XML feed
        if "<rss" in content.lower() or "<feed" in content.lower() or "<?xml" in content.lower():
            feed = feedparser.parse(content)
            # Read the top items
            for entry in feed.entries[:12]:
                title = getattr(entry, "title", "").strip()
                link = getattr(entry, "link", "").strip()
                if not title or len(title) < 5:
                    continue
                if not link:
                    link = board.website_url
                    
                summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
                if summary:
                    summary = BeautifulSoup(summary, "html.parser").get_text(strip=True)[:320]
                
                published = getattr(entry, "published", "") or getattr(entry, "updated", "") or ""
                
                sev, cat = analyze_severity_and_category(title, summary)
                c_hash = generate_update_hash(board.id, title, link)
                
                update = RegulatoryUpdate(
                    id=f"{board.id}_{c_hash[:12]}",
                    board_id=board.id,
                    board_name=board.short_code,
                    jurisdiction=board.jurisdiction,
                    title=title,
                    url=link,
                    summary=summary if summary else None,
                    category=cat,
                    severity=sev,
                    detected_at=time.time(),
                    published_date=published if published else None,
                    content_hash=c_hash,
                    is_read=False,
                    pinned=False
                )
                updates.append(update)
        else:
            # Parse HTML announcements table or links
            soup = BeautifulSoup(content, "html.parser")
            links = soup.find_all("a", href=True)
            candidate_links = []
            for a in links:
                t = a.get_text(strip=True)
                if len(t) > 25 and not any(skip in t.lower() for skip in ["copyright", "privacy", "terms", "sitemap", "contact", "about"]):
                    href = a["href"]
                    if href.startswith("/"):
                        href = board.website_url.rstrip("/") + href
                    candidate_links.append((t, href))
                    if len(candidate_links) >= 10:
                        break
                        
            for t, link in candidate_links:
                sev, cat = analyze_severity_and_category(t)
                c_hash = generate_update_hash(board.id, t, link)
                update = RegulatoryUpdate(
                    id=f"{board.id}_{c_hash[:12]}",
                    board_id=board.id,
                    board_name=board.short_code,
                    jurisdiction=board.jurisdiction,
                    title=t,
                    url=link,
                    summary=None,
                    category=cat,
                    severity=sev,
                    detected_at=time.time(),
                    published_date=None,
                    content_hash=c_hash,
                    is_read=False,
                    pinned=False
                )
                updates.append(update)
                
        return "HEALTHY", latency_ms, updates, None

    except httpx.TimeoutException:
        latency_ms = round((time.time() - start_time) * 1000, 1)
        return "DEGRADED", latency_ms, updates, "Gateway response timed out (>6s)"
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 1)
        return "ERROR", latency_ms, updates, f"Connection failed: {str(e)[:120]}"
