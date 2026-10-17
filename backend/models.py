import time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator

class RegulatoryBoard(BaseModel):
    id: str
    name: str
    short_code: str
    jurisdiction: str  # "IN", "US", "UK", "EU", "GLOBAL"
    category: str      # "Securities", "Central Banking", "Conduct", "Markets"
    website_url: str
    feed_url: str
    enabled: bool = True
    poll_interval_sec: int = 10
    last_status: str = "PENDING"  # "HEALTHY", "DEGRADED", "ERROR", "PENDING"
    last_checked: Optional[float] = None
    last_latency_ms: Optional[float] = None
    last_hash: Optional[str] = None
    error_count: int = 0
    total_checks: int = 0
    last_error_msg: Optional[str] = None

class RegulatoryUpdate(BaseModel):
    id: str
    board_id: str
    board_name: str
    jurisdiction: str
    title: str
    url: str
    summary: Optional[str] = None
    category: str = "Circular"  # "Circular", "Enforcement", "Monetary Policy", "Regulation", "Warning"
    severity: str = "MEDIUM"     # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    detected_at: float = Field(default_factory=time.time)
    published_date: Optional[str] = None
    content_hash: str
    is_read: bool = False
    pinned: bool = False
    effective_deadline: Optional[str] = None
    compliance_urgency: Optional[str] = None

class SystemStats(BaseModel):
    is_running: bool
    started_at: float
    uptime_seconds: float
    total_checks: int
    total_updates_detected: int
    cycle_interval_sec: int
    current_cycle_seconds_remaining: float
    monitored_boards_count: int
    active_boards_count: int
    healthy_boards_count: int
    recent_errors_count: int

class AddBoardRequest(BaseModel):
    name: str
    short_code: str
    jurisdiction: str
    category: str
    website_url: str
    feed_url: str
    poll_interval_sec: int = 10

class OutboxDispatch(BaseModel):
    id: str
    company_name: str
    recipient_email: str
    sector: str
    region: str
    announcement_id: str
    announcement_title: str
    board_name: str
    severity: str
    risk_summary: str
    email_subject: str
    email_body: str
    status: str = "PENDING_REVIEW"  # "PENDING_REVIEW", "SENT", "REJECTED"
    created_at: float = Field(default_factory=time.time)
    reviewed_at: Optional[float] = None
    executives_info: Optional[str] = None
    sec_filing_info: Optional[str] = None
    is_subscribed: bool = False
    subscription_tier: Optional[str] = "UNSUBSCRIBED"
    template_type: Optional[str] = "PROSPECT_EARLY_WARNING"  # "SUBSCRIBED_VIP" or "PROSPECT_EARLY_WARNING"

class UpdateDispatchRequest(BaseModel):
    recipient_email: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    status: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class CompanyExecutiveRecord(BaseModel):
    id: str
    company_id: str
    company_name: str
    name: str
    title: str
    role_type: str = "EXECUTIVE"  # "FOUNDER", "CEO", "MD", "DIRECTOR", "EXECUTIVE"
    email: Optional[str] = "N/A"
    phone: Optional[str] = "N/A"
    linkedin_url: Optional[str] = "N/A"
    provenance: Optional[str] = "Website"
    created_at: float = Field(default_factory=time.time)

class ImpactedCompany(BaseModel):
    id: str
    country: str = "GLOBAL"
    city: str = "N/A"
    state: Optional[str] = "N/A"
    pincode: Optional[str] = "N/A"
    address: Optional[str] = "N/A"
    physical_address: Optional[str] = "N/A"
    company_name: str = ""
    name: str = ""
    normalized_name: str
    domain: Optional[str] = "N/A"
    sector: str = "General"
    company_email: Optional[str] = "N/A"
    primary_email: Optional[str] = "N/A"
    company_phone: Optional[str] = "N/A"
    phone: Optional[str] = "N/A"
    
    # Subscription status & tier
    subscription_status: str = "NOT_SUBSCRIBED"  # "SUBSCRIBED" or "NOT_SUBSCRIBED"
    is_subscribed: bool = False
    subscription_tier: str = "UNSUBSCRIBED"  # "UNSUBSCRIBED", "ACTIVE_SUBSCRIBER", "ENTERPRISE", "PROSPECT"
    subscribed_at: Optional[float] = None

    # Key Leadership direct references (Founder, MD, CEO with email & phone)
    founder_name: Optional[str] = "N/A"
    founder_title: Optional[str] = "N/A"
    founder_email: Optional[str] = "N/A"
    founder_phone: Optional[str] = "N/A"

    ceo_name: Optional[str] = "N/A"
    ceo_email: Optional[str] = "N/A"
    ceo_phone: Optional[str] = "N/A"

    md_name: Optional[str] = "N/A"
    md_email: Optional[str] = "N/A"
    md_phone: Optional[str] = "N/A"

    executives_json: Optional[str] = "[]"
    executives: List[CompanyExecutiveRecord] = Field(default_factory=list)
    data_provenance: Optional[str] = "Website"
    first_seen_at: float = Field(default_factory=time.time)
    last_seen_at: float = Field(default_factory=time.time)

    # Verification and trust assessment attributes
    trust_score: Optional[int] = 0
    verification_status: Optional[str] = "UNVERIFIED"  # "UNVERIFIED", "VERIFIED", "FLAGGED"
    verified_at: Optional[float] = None
    verification_report_json: Optional[str] = "{}"

    @model_validator(mode="before")
    @classmethod
    def sync_country_and_aliases(cls, data: Any):
        if isinstance(data, dict):
            # address <-> physical_address
            if data.get("address") and (not data.get("physical_address") or data.get("physical_address") == "N/A"):
                data["physical_address"] = data["address"]
            elif data.get("physical_address") and (not data.get("address") or data.get("address") == "N/A"):
                data["address"] = data["physical_address"]
            # company_name <-> name
            if data.get("company_name") and not data.get("name"):
                data["name"] = data["company_name"]
            elif data.get("name") and not data.get("company_name"):
                data["company_name"] = data["name"]

            # company_email <-> primary_email
            if data.get("company_email") and data.get("company_email") != "N/A" and (not data.get("primary_email") or data.get("primary_email") == "N/A"):
                data["primary_email"] = data["company_email"]
            elif data.get("primary_email") and data.get("primary_email") != "N/A" and (not data.get("company_email") or data.get("company_email") == "N/A"):
                data["company_email"] = data["primary_email"]

            # company_phone <-> phone
            if data.get("company_phone") and data.get("company_phone") != "N/A" and (not data.get("phone") or data.get("phone") == "N/A"):
                data["phone"] = data["company_phone"]
            elif data.get("phone") and data.get("phone") != "N/A" and (not data.get("company_phone") or data.get("company_phone") == "N/A"):
                data["company_phone"] = data["phone"]

            # is_subscribed <-> subscription_status
            if data.get("is_subscribed"):
                data["subscription_status"] = "SUBSCRIBED"
            elif data.get("subscription_status") == "SUBSCRIBED":
                data["is_subscribed"] = True
            else:
                data["subscription_status"] = "NOT_SUBSCRIBED"
                data["is_subscribed"] = False
        return data

class UpdateSubscriptionRequest(BaseModel):
    is_subscribed: bool
    subscription_tier: Optional[str] = "ACTIVE_SUBSCRIBER"

class UpdateCompanyRequest(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    physical_address: Optional[str] = None
    sector: Optional[str] = None
    domain: Optional[str] = None
    primary_email: Optional[str] = None
    company_email: Optional[str] = None
    phone: Optional[str] = None
    company_phone: Optional[str] = None
    founder_name: Optional[str] = None
    founder_title: Optional[str] = None
    founder_email: Optional[str] = None
    founder_phone: Optional[str] = None
    ceo_name: Optional[str] = None
    ceo_email: Optional[str] = None
    ceo_phone: Optional[str] = None
    md_name: Optional[str] = None
    md_email: Optional[str] = None
    md_phone: Optional[str] = None
    is_subscribed: Optional[bool] = None
    subscription_tier: Optional[str] = None

class VerificationCheckItem(BaseModel):
    name: str
    status: str  # "PASS", "FAIL", "WARN"
    score_awarded: int
    max_score: int
    detail: str

class CompanyVerificationReport(BaseModel):
    company_id: str
    company_name: str
    trust_score: int  # 0 to 100
    confidence_level: str  # "HIGH_CONFIDENCE", "MODERATE_CONFIDENCE", "LOW_CONFIDENCE"
    verified_at: float = Field(default_factory=time.time)
    checks: List[VerificationCheckItem] = Field(default_factory=list)
    registry_match: Optional[str] = None
    summary: str

