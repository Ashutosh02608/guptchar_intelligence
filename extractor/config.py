"""
Configuration constants and settings for Extractor Engine.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = BASE_DIR / "outputs"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Common Chrome binary search paths on Windows
CHROME_CANDIDATE_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
]

def find_browser_binary() -> str | None:
    for path in CHROME_CANDIDATE_PATHS:
        if os.path.exists(path):
            return path
    return None

# User-Agent headers
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# SEC EDGAR requires a specific User-Agent format: Sample Company Name AdminContact@<sample company domain>.com
SEC_USER_AGENT = "GuptcharResearch IntelligenceLab admin@guptchar.internal"

# Keywords that trigger Stage C (SEC EDGAR look-up)
FINANCIAL_SECTOR_KEYWORDS = {
    "finance", "financial", "hedge fund", "hedge funds", "private equity", "pe",
    "venture capital", "vc", "asset management", "wealth management", "capital",
    "investment", "invest", "banking", "bank", "broker", "securities", "funds",
    "advisory", "fintech", "fund manager", "portfolio", "trading", "quant", "family office"
}

# Subpages to discover and crawl during Stage B
SUBPAGE_TARGET_SLUGS = [
    "/contact", "/contact-us", "/contactus", "/get-in-touch",
    "/about", "/about-us", "/aboutus", "/company", "/who-we-are",
    "/team", "/our-team", "/people", "/leadership", "/management", "/executives"
]

# CDP Stealth Injection Script to mask navigator.webdriver and browser automation flags
CDP_STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
});
window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {}
};
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
);
Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
});
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
});
"""
