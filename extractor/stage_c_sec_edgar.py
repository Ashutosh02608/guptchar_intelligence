"""
Stage C: Financial Regulatory Filings Look-up (SEC EDGAR Engine)
- Dynamic sector trigger (activated if query matches finance, hedge funds, PE, etc.)
- Free official SEC EDGAR REST API (EFTS Full-Text Search + CIK Submissions API)
- Parses Form D XML & Form ADV filings for registered Related Persons / C-Suite
- Tags data provenance ("SEC Filing / Website" vs "Website")
"""

import re
import time
import logging
import urllib.parse
from typing import List, Dict, Optional, Tuple
import xml.etree.ElementTree as ET
import httpx

from .config import SEC_USER_AGENT, FINANCIAL_SECTOR_KEYWORDS
from .models import EnrichedEntity, ExecutiveProfile, SECFilingInfo

logger = logging.getLogger("extractor.stage_c")

EFTS_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
SUBMISSIONS_URL_TEMPLATE = "https://data.sec.gov/submissions/CIK{cik}.json"


def is_financial_sector(sector: str) -> bool:
    """Checks if the query sector triggers the SEC EDGAR financial lookup."""
    sector_lower = sector.lower()
    return any(kw in sector_lower for kw in FINANCIAL_SECTOR_KEYWORDS)


class SECEDGAREngine:
    """Interfaces with official SEC EDGAR EFTS and CIK Submissions APIs."""

    def __init__(self):
        self.headers = {
            "User-Agent": SEC_USER_AGENT,
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate",
            "Host": "efts.sec.gov"
        }

    def search_filings(self, entity_name: str) -> List[Dict]:
        """Query SEC EFTS Full-Text Search for Form D, ADV, 10-K filings."""
        # Clean entity name for search query (remove Ltd, Inc, LLC, Partners, etc.)
        cleaned_name = re.sub(r'\b(LLC|Inc|Ltd|Limited|Corp|Corporation|Partners|LP|PLC)\b\.?', '', entity_name, flags=re.IGNORECASE).strip()
        if len(cleaned_name) < 3:
            cleaned_name = entity_name

        query = f'"{cleaned_name}"'
        params = {
            "q": query,
            "forms": "D,ADV,10-K,8-K",
            "from": 0,
            "size": 5
        }

        try:
            with httpx.Client(timeout=9.0, headers=self.headers) as client:
                resp = client.get(EFTS_SEARCH_URL, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    hits = data.get("hits", {}).get("hits", [])
                    results = []
                    for h in hits:
                        source = h.get("_source", {})
                        results.append({
                            "ciks": source.get("ciks", []),
                            "entity_name": source.get("entity_name", source.get("display_names", ["N/A"])[0] if source.get("display_names") else "N/A"),
                            "form": source.get("form", "Form D"),
                            "file_date": source.get("file_date", "N/A"),
                            "adsh": source.get("adsh", "N/A"),
                        })
                    return results
        except Exception as e:
            logger.debug(f"SEC EFTS lookup notice for '{entity_name}': {e}")

        return []

    def fetch_cik_submissions(self, cik: str) -> Optional[Dict]:
        """Fetch SEC Company Submissions API by 10-digit padded CIK."""
        padded_cik = str(cik).strip().zfill(10)
        url = SUBMISSIONS_URL_TEMPLATE.format(cik=padded_cik)
        headers = dict(self.headers)
        headers["Host"] = "data.sec.gov"

        try:
            with httpx.Client(timeout=8.0, headers=headers) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.debug(f"CIK submissions fetch notice for {cik}: {e}")

        return None

    def fetch_form_d_xml_persons(self, cik: str, adsh: str) -> List[ExecutiveProfile]:
        """
        Parses Form D XML filing to extract registered Related Persons & C-Suite.
        SEC Archives directory structure: /Archives/edgar/data/{cik}/{adsh_nodashes}/
        """
        raw_adsh = adsh.replace("-", "")
        padded_cik = str(cik).strip().lstrip("0")
        xml_url = f"https://www.sec.gov/Archives/edgar/data/{padded_cik}/{raw_adsh}/primary_doc.xml"

        headers = dict(self.headers)
        headers["Host"] = "www.sec.gov"

        executives: List[ExecutiveProfile] = []
        try:
            with httpx.Client(timeout=8.0, headers=headers) as client:
                resp = client.get(xml_url)
                if resp.status_code == 200 and "<relatedPersonsList>" in resp.text:
                    root = ET.fromstring(resp.text)
                    for person_node in root.findall(".//relatedPersonInfo"):
                        first_name = person_node.findtext(".//firstName", "N/A").strip()
                        last_name = person_node.findtext(".//lastName", "N/A").strip()
                        full_name = f"{first_name} {last_name}".strip()
                        
                        relationship_nodes = person_node.findall(".//relationship")
                        relationships = [r.text.strip() for r in relationship_nodes if r.text]
                        title = ", ".join(relationships) if relationships else "Executive Officer / Director"

                        if full_name and full_name != "N/A":
                            executives.append(ExecutiveProfile(
                                name=full_name,
                                title=title,
                                email="N/A",
                                phone="N/A",
                                linkedin_url="N/A",
                                provenance="SEC Filing"
                            ))
        except Exception as e:
            logger.debug(f"Form D XML parsing notice for {adsh}: {e}")

        return executives


class SECFilingsLookup:
    """Enriches entities with SEC EDGAR filings and tags data provenance."""

    def __init__(self):
        self.edgar = SECEDGAREngine()

    def process_entity(self, entity: EnrichedEntity) -> EnrichedEntity:
        """Looks up SEC filings, extracts Form D / ADV Related Persons, and tags provenance."""
        # 1. Dynamic sector trigger check
        if not is_financial_sector(entity.sector):
            logger.debug(f"Skipping SEC look-up for non-financial sector '{entity.sector}'")
            entity.data_provenance = "Website"
            return entity

        logger.info(f"Stage C [SEC EDGAR]: Initiating regulatory filings scan for '{entity.name}'")

        filings_data = self.edgar.search_filings(entity.name)
        if not filings_data:
            # If search returns no filings, entity remains "Website" provenance
            logger.info(f"Stage C: No SEC filings matched for '{entity.name}'. Retaining Website provenance.")
            return entity

        sec_filings_list: List[SECFilingInfo] = []
        sec_executives: List[ExecutiveProfile] = []

        for f in filings_data[:3]:
            ciks = f.get("ciks", [])
            primary_cik = str(ciks[0]) if ciks else "N/A"
            adsh = f.get("adsh", "N/A")
            form_type = f.get("form", "Form D")
            file_date = f.get("file_date", "N/A")
            company_registered_name = f.get("entity_name", entity.name)

            filing_url = f"https://www.sec.gov/edgar/browse/?CIK={primary_cik}" if primary_cik != "N/A" else "https://www.sec.gov/edgar/searchedgar/companysearch"

            # Parse Form D Related Persons if accession number is valid
            related_persons = []
            if form_type == "D" and adsh != "N/A" and primary_cik != "N/A":
                time.sleep(0.15) # Rate limit compliance
                related_persons = self.edgar.fetch_form_d_xml_persons(primary_cik, adsh)
                sec_executives.extend(related_persons)

            sec_filings_list.append(SECFilingInfo(
                cik=primary_cik,
                company_name=company_registered_name,
                form_type=form_type,
                filing_date=file_date,
                accession_number=adsh,
                filing_url=filing_url,
                related_persons=related_persons
            ))

        entity.sec_filings = sec_filings_list

        # Merge SEC executives with website executives & tag composite provenance
        if sec_executives:
            existing_names = {ex.name.lower(): ex for ex in entity.executives}
            for sec_ex in sec_executives:
                name_key = sec_ex.name.lower()
                if name_key in existing_names:
                    # Tag composite provenance: "SEC Filing / Website"
                    existing_names[name_key].provenance = "SEC Filing / Website"
                    if existing_names[name_key].title == "N/A":
                        existing_names[name_key].title = sec_ex.title
                else:
                    sec_ex.provenance = "SEC Filing"
                    existing_names[name_key] = sec_ex

            entity.executives = list(existing_names.values())[:8]
            entity.data_provenance = "SEC Filing / Website"
            logger.info(f"Stage C [SEC EDGAR]: Found {len(sec_filings_list)} filings & {len(sec_executives)} related officers for '{entity.name}'. Tagged: 'SEC Filing / Website'")
        elif sec_filings_list:
            entity.data_provenance = "SEC Filing / Website"
            logger.info(f"Stage C [SEC EDGAR]: Found {len(sec_filings_list)} filings for '{entity.name}'. Tagged: 'SEC Filing / Website'")

        return entity


def run_stage_c(entities: List[EnrichedEntity]) -> List[EnrichedEntity]:
    """Batch executes Stage C SEC EDGAR Look-up."""
    lookup = SECFilingsLookup()
    enriched: List[EnrichedEntity] = []
    for ent in entities:
        try:
            res = lookup.process_entity(ent)
            enriched.append(res)
        except Exception as e:
            logger.error(f"Error in Stage C for {ent.name}: {e}")
            enriched.append(ent)
    return enriched
