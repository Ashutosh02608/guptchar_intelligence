"""
Stage A: Local Entity Discovery (Google Maps Scraper)
- Selenium Headless Chrome with Chrome DevTools Protocol (CDP) flag masking
- Overcomes consent banners, scrolls results, and inspects place detail pages
- Extracts: Business Name, Physical Address, Website URL, Gatekeeper Phone Number
- Built-in fallback generator for headless/containerized environments
"""

import re
import time
import urllib.parse
import logging
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import httpx

from .config import find_browser_binary, DEFAULT_USER_AGENT, CDP_STEALTH_JS
from .models import EnrichedEntity

logger = logging.getLogger("extractor.stage_a")

# Negative blacklist patterns: ATMs, public infrastructure, transit, residential structures, landmarks
BOGUS_NODE_PATTERNS = [
    r'\b(atm|cdm|cash machine|cash point|coin machine|cash deposit|locker|safe deposit)\b',
    r'\b(metro station|subway station|railway station|bus station|bus stop|train station|ferry terminal|airport|parking lot|parking garage|toll plaza|highway|expressway|flyover)\b',
    r'\b(post office|police station|police booth|fire station|courthouse|embassy|consulate|passport office|municipal corporation)\b',
    r'\b(temple|church|mosque|shrine|gurdwara|synagogue|cathedral|chapel|monastery|cemetery|graveyard)\b',
    r'\b(apartment[s]?|residency|residential complex|housing society|enclave|colony|mohalla|chowk|crossroad|circle|junction)\b',
    r'\b(government hospital|public school|high school|kindergarten|playground|public park|garden|zoo)\b',
]

EXCLUDED_NAME_TOKENS = {
    "n/a", "directions", "website", "share", "save", "call", "reviews",
    "overview", "photos", "about", "unknown", "open", "closed", "nearby",
    "results", "search", "menu", "claim this business", "suggest an edit"
}

def is_legit_corporate_entity(name: str, city: str = "", country: str = "") -> bool:
    """
    Validates if an extracted Maps/OSM listing represents an authentic commercial enterprise
    rather than an ATM, transit stop, residential compound, or UI artifact.
    """
    if not name or not isinstance(name, str):
        return False
    
    clean = name.strip()
    clean_lower = clean.lower()

    # Minimum length and must contain alphabetical characters
    if len(clean) < 3 or not re.search(r'[a-zA-Z]{2,}', clean):
        return False

    # Exclude UI tokens
    if clean_lower in EXCLUDED_NAME_TOKENS:
        return False

    # Exclude if name is merely the city or country itself
    if city and clean_lower == city.strip().lower():
        return False
    if country and clean_lower == country.strip().lower():
        return False

    # Exclude if name is purely street/plot numbering
    if re.match(r'^(?:sector\s*\d+|road|street|gali|lane|plot\s*no|lane\s*\d+)\b', clean_lower):
        return False

    # Exclude non-corporate landmarks, transit, ATMs, etc.
    for pat in BOGUS_NODE_PATTERNS:
        if re.search(pat, clean_lower):
            return False

    return True


class GoogleMapsScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.driver = None

    def _init_driver(self):
        """Initialize Selenium Chrome driver with CDP masking and anti-detection."""
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service

        options = Options()
        if self.headless:
            options.add_argument("--headless=new")
        
        binary_path = find_browser_binary()
        if binary_path:
            options.binary_location = binary_path

        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument(f"user-agent={DEFAULT_USER_AGENT}")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--lang=en-US,en;q=0.9")
        options.add_argument("--disable-extensions")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        # Let Selenium Manager handle driver resolution automatically
        self.driver = webdriver.Chrome(options=options)
        self.driver.set_page_load_timeout(20)
        self.driver.set_script_timeout(15)
        
        # Apply Chrome DevTools Protocol (CDP) stealth flag masking
        try:
            self.driver.execute_cdp_cmd(
                "Page.addScriptToEvaluateOnNewDocument",
                {"source": CDP_STEALTH_JS}
            )
        except Exception as e:
            logger.warning(f"CDP stealth injection notice: {e}")

    def _dismiss_consent(self):
        """Bypass and click through Google cookie/consent dialogs."""
        if not self.driver:
            return
        consent_selectors = [
            "//button[contains(., 'Accept all')]",
            "//button[contains(., 'I agree')]",
            "//button[contains(., 'Reject all')]",
            "//form//button",
            "button[aria-label*='Accept']",
            "button[aria-label*='agree']"
        ]
        from selenium.webdriver.common.by import By
        for xpath in consent_selectors[:4]:
            try:
                btns = self.driver.find_elements(By.XPATH, xpath)
                for btn in btns:
                    if btn.is_displayed():
                        btn.click()
                        time.sleep(1.0)
                        return
            except Exception:
                pass

    def search_entities(
        self,
        country: str,
        city: str,
        sector: str,
        limit: int = 50
    ) -> List[EnrichedEntity]:
        """
        Execute Google Maps search with CDP masking, scroll feed, and extract places.
        """
        query_str = f"{sector} in {city}, {country}"
        encoded_query = urllib.parse.quote_plus(query_str)
        search_url = f"https://www.google.com/maps/search/{encoded_query}?hl=en"

        logger.info(f"Stage A [Google Maps]: Querying '{query_str}' -> {search_url}")
        
        entities: List[EnrichedEntity] = []
        try:
            self._init_driver()
            self.driver.get(search_url)
            time.sleep(2.5)
            self._dismiss_consent()

            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC

            # Wait for results feed or place listing
            feed_container = None
            try:
                feed_container = WebDriverWait(self.driver, 7).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed'], div[aria-label*='Results']"))
                )
            except Exception:
                logger.info("Feed container not detected by role, parsing viewport directly.")

            # Scroll feed to load items up to requested limit
            scroll_attempts = 0
            max_scrolls = max(3, limit // 3)
            while scroll_attempts < max_scrolls:
                if feed_container:
                    self.driver.execute_script("arguments[0].scrollBy(0, 1000);", feed_container)
                else:
                    self.driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(1.2)
                scroll_attempts += 1

            # Parse items from DOM
            place_elements = self.driver.find_elements(By.CSS_SELECTOR, "div[role='article'], div.Nv2PK, a.hfpxzc")
            logger.info(f"Discovered {len(place_elements)} raw candidate nodes in Maps DOM.")

            # Extract distinct place cards
            seen_names = set()
            for elem in place_elements:
                if len(entities) >= limit:
                    break
                try:
                    text_content = elem.text.strip()
                    html_content = elem.get_attribute("innerHTML") or ""
                    
                    # Extract name
                    name = "N/A"
                    aria_label = elem.get_attribute("aria-label")
                    if aria_label:
                        name = aria_label.strip()
                    else:
                        lines = [l.strip() for l in text_content.split("\n") if l.strip()]
                        if lines:
                            name = lines[0]

                    if not is_legit_corporate_entity(name, city, country) or name in seen_names:
                        continue
                    seen_names.add(name)

                    # Extract website (filter out search engines, social shares, and web standard schemas)
                    website = "N/A"
                    web_matches = re.findall(r'href="(https?://[^"]+)"', html_content)
                    for url in web_matches:
                        url_lower = url.lower()
                        if not any(blocked in url_lower for blocked in [
                            "google.com", "gstatic.com", "schema.org", "facebook.com",
                            "twitter.com", "x.com", "instagram.com", "linkedin.com",
                            "w3.org", "wikipedia.org", "youtube.com"
                        ]):
                            website = url
                            break

                    # Extract phone number
                    phone = "N/A"
                    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4})', text_content)
                    if phone_match:
                        phone = phone_match.group(1).strip()

                    # Extract physical address
                    address = f"{city}, {country}"
                    addr_match = re.search(r'([0-9]+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Way|Dr|Drive|Plaza|Floor|Suite|Building)[^,\n]*)', text_content, re.IGNORECASE)
                    if addr_match:
                        address = f"{addr_match.group(1).strip()}, {city}, {country}"

                    entity = EnrichedEntity(
                        name=name,
                        sector=sector,
                        country=country,
                        city=city,
                        physical_address=address,
                        website_url=website,
                        gatekeeper_phone=phone,
                        data_provenance="Google Maps"
                    )
                    entities.append(entity)
                except Exception as ex:
                    logger.debug(f"Error parsing single place node: {ex}")

        except Exception as e:
            logger.warning(f"Selenium Google Maps scraping encountered exception: {e}")
        finally:
            if self.driver:
                try:
                    self.driver.quit()
                except Exception:
                    pass
                self.driver = None

        return entities


class FallbackDiscoveryGenerator:
    """
    High-reliability discovery fallback for containerized or headless environments
    where Chrome DevTools Protocol or Google Maps displays anti-bot challenges.
    Queries OpenStreetMap Nominatim and public intelligence registries.
    """

    @classmethod
    def generate_entities(
        cls,
        country: str,
        city: str,
        sector: str,
        limit: int = 50
    ) -> List[EnrichedEntity]:
        logger.info(f"Stage A [Fallback]: Invoking intelligent entity discovery for '{sector}' in {city}, {country}")
        entities: List[EnrichedEntity] = []

        # Attempt 1: Query OpenStreetMap Nominatim for real commercial nodes with extratags
        headers = {"User-Agent": "GuptcharResearchBot/1.0 (contact@guptchar.internal)"}

        # Derive search queries (full phrase + simplified keyword fallback)
        queries = [f"{sector} {city} {country}"]
        sector_lower = sector.lower()
        keyword_fallbacks = [
            ("bank", ["bank", "banking"]),
            ("finance", ["finance", "financial"]),
            ("investment", ["hedge fund", "private equity", "asset management", "invest"]),
            ("stock broker", ["capital markets", "securities", "broker"]),
            ("insurance", ["insurance", "reinsurance"]),
            ("fintech", ["fintech", "payments"]),
            ("crypto", ["crypto", "digital assets", "web3"]),
            ("real estate", ["real estate", "reit"]),
            ("technology", ["cybersecurity", "cloud", "it "]),
            ("consulting", ["corporate", "governance", "advisory"])
        ]
        for kw, patterns in keyword_fallbacks:
            if any(p in sector_lower for p in patterns):
                queries.append(f"{kw} {city} {country}")
                break

        for query_candidate in queries:
            if len(entities) >= limit:
                break
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote_plus(query_candidate)}&format=json&addressdetails=1&extratags=1&limit={limit}"
                with httpx.Client(timeout=6.0, headers=headers) as client:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        for item in data:
                            raw_name = item.get("display_name", "").split(",")[0].strip()
                            display_name = item.get("display_name", f"{city}, {country}")

                            # Quality Gate: Exclude non-corporate landmarks, transit, ATMs, and apartments
                            if not is_legit_corporate_entity(raw_name, city, country):
                                continue

                            if raw_name.lower() in [e.name.lower() for e in entities]:
                                continue

                            extratags = item.get("extratags") or {}
                            authentic_site = (
                                extratags.get("website") or
                                extratags.get("contact:website") or
                                extratags.get("url") or
                                "N/A"
                            ).strip()

                            if authentic_site and authentic_site != "N/A":
                                if not authentic_site.startswith("http://") and not authentic_site.startswith("https://"):
                                    authentic_site = f"https://{authentic_site}"
                            else:
                                authentic_site = "N/A"

                            authentic_phone = (
                                extratags.get("phone") or
                                extratags.get("contact:phone") or
                                "N/A"
                            ).strip()

                            authentic_email = (
                                extratags.get("email") or
                                extratags.get("contact:email") or
                                "N/A"
                            ).strip()

                            entities.append(EnrichedEntity(
                                name=raw_name,
                                sector=sector,
                                country=country,
                                city=city,
                                physical_address=display_name,
                                website_url=authentic_site,
                                gatekeeper_phone=authentic_phone,
                                primary_email=authentic_email,
                                data_provenance="OpenStreetMap / Registry"
                            ))
                            if len(entities) >= limit:
                                break
            except Exception as e:
                logger.debug(f"OSM lookup notice for '{query_candidate}': {e}")

        # Strictly return authentic discovered entities
        return entities[:limit]


def run_stage_a(
    country: str,
    city: str,
    sector: str,
    limit: int = 50,
    try_selenium: bool = True
) -> List[EnrichedEntity]:
    """
    Main entrypoint for Stage A discovery.
    Runs Google Maps Selenium scraper first; seamlessly engages fallback if needed.
    """
    results: List[EnrichedEntity] = []

    if try_selenium:
        try:
            scraper = GoogleMapsScraper(headless=True)
            results = scraper.search_entities(country, city, sector, limit=limit)
        except Exception as e:
            logger.warning(f"Selenium stage failed: {e}")

    # If Selenium found fewer results than needed, backfill with fallback generator
    if len(results) < limit:
        needed = limit - len(results)
        logger.info(f"Stage A backfilling {needed} entities via Fallback Generator.")
        fallback_results = FallbackDiscoveryGenerator.generate_entities(country, city, sector, limit=needed)
        results.extend(fallback_results)

    return results[:limit]
