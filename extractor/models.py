"""
Pydantic Models for Extractor Engine with mandatory 'N/A' fallback handling.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


def clean_na(val: Optional[str], default: str = "N/A") -> str:
    """Normalize empty, null, or whitespace strings to 'N/A'."""
    if val is None:
        return default
    s = str(val).strip()
    if not s or s.lower() in ("none", "null", "undefined", "n/a", "na", "-"):
        return default
    return s


class ExecutiveProfile(BaseModel):
    name: str = Field(default="N/A", description="Full name of executive or director")
    title: str = Field(default="N/A", description="Corporate role or designation")
    email: str = Field(default="N/A", description="Direct or corporate contact email")
    phone: str = Field(default="N/A", description="Direct or office contact phone")
    linkedin_url: str = Field(default="N/A", description="Public LinkedIn profile URL")
    provenance: str = Field(default="Website", description="Source: 'Website', 'SEC Filing', or 'SEC Filing / Website'")

    @field_validator("name", "title", "email", "phone", "linkedin_url", "provenance", mode="before")
    @classmethod
    def enforce_na(cls, v):
        return clean_na(v)


class SECFilingInfo(BaseModel):
    cik: str = Field(default="N/A", description="SEC Central Index Key")
    company_name: str = Field(default="N/A", description="Registered Entity Name in SEC EDGAR")
    form_type: str = Field(default="N/A", description="Filing Form Type (e.g., Form D, Form ADV, 10-K)")
    filing_date: str = Field(default="N/A", description="Date filed with SEC")
    accession_number: str = Field(default="N/A", description="SEC EDGAR Accession Number")
    filing_url: str = Field(default="N/A", description="Direct SEC EDGAR URL")
    related_persons: List[ExecutiveProfile] = Field(default_factory=list, description="C-Suite / Directors parsed from filing")

    @field_validator("cik", "company_name", "form_type", "filing_date", "accession_number", "filing_url", mode="before")
    @classmethod
    def enforce_na(cls, v):
        return clean_na(v)


class EnrichedEntity(BaseModel):
    name: str = Field(default="N/A", description="Entity Legal/Business Name")
    sector: str = Field(default="N/A", description="Operating Sector or Industry")
    country: str = Field(default="N/A", description="Target Country")
    city: str = Field(default="N/A", description="Target City")
    physical_address: str = Field(default="N/A", description="Verified Physical Address")
    website_url: str = Field(default="N/A", description="Primary Corporate Domain URL")
    gatekeeper_phone: str = Field(default="N/A", description="Main Switchboard / Reception Phone")
    primary_email: str = Field(default="N/A", description="Heuristically ranked corporate primary email")
    alternate_emails: List[str] = Field(default_factory=list, description="Secondary discovered corporate emails")
    additional_phones: List[str] = Field(default_factory=list, description="Discovered direct lines or department numbers")
    company_summary: str = Field(default="N/A", description="1-sentence company summary")
    subpages_crawled: List[str] = Field(default_factory=list, description="Subpages successfully discovered & parsed")
    executives: List[ExecutiveProfile] = Field(default_factory=list, description="Key executives and leadership profiles")
    sec_filings: List[SECFilingInfo] = Field(default_factory=list, description="Associated SEC EDGAR filings if financial entity")
    data_provenance: str = Field(default="Website", description="Composite provenance tag")
    extraction_timestamp: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ"))

    @field_validator(
        "name", "sector", "country", "city", "physical_address",
        "website_url", "gatekeeper_phone", "primary_email",
        "company_summary", "data_provenance", "extraction_timestamp",
        mode="before"
    )
    @classmethod
    def enforce_string_na(cls, v):
        return clean_na(v)

    @model_validator(mode="after")
    def resolve_provenance(self):
        # If any executive or filing comes from SEC, tag composite provenance
        has_sec_filing = bool(self.sec_filings and any(f.cik != "N/A" for f in self.sec_filings))
        has_sec_exec = any("SEC" in getattr(e, "provenance", "") for e in self.executives)
        if has_sec_filing or has_sec_exec:
            self.data_provenance = "SEC Filing / Website"
        elif self.data_provenance == "N/A":
            self.data_provenance = "Website"
        return self


class ExtractorQuery(BaseModel):
    country: str = Field(..., description="Target Country (e.g. United States, United Kingdom, India)")
    city: str = Field(..., description="Target City (e.g. New York, London, Mumbai)")
    sector: str = Field(..., description="Target Sector/Keyword (e.g. Hedge Funds, Private Equity, FinTech)")
    limit: int = Field(default=20, ge=1, le=100, description="Max entities to discover and enrich")
    check_sec: bool = Field(default=True, description="Enable automatic SEC EDGAR regulatory filings lookup")
    export_pdf: bool = Field(default=True, description="Generate executive PDF dossier")
    export_json: bool = Field(default=True, description="Generate strict JSON export")


class DossierResult(BaseModel):
    query: ExtractorQuery
    total_found: int
    entities: List[EnrichedEntity]
    json_path: Optional[str] = None
    pdf_path: Optional[str] = None
    execution_time_sec: float = 0.0
    status: str = "COMPLETED"
