"""
Guptchar Advisory Email Templates
Generates distinct, high-impact email communications for:
1. Subscribed Companies (VIP / Enterprise Compliance Partner Advisory)
2. Non-Subscribed Companies (Complimentary Early-Warning & Value Conversion Dispatch)
"""

from typing import Tuple, Optional, List, Any
from .models import ImpactedCompany, RegulatoryUpdate


def get_recipient_salutation(company: ImpactedCompany) -> str:
    """Returns personalized executive greeting if leadership is known."""
    if company.founder_name and company.founder_name != "N/A":
        return f"Dear {company.founder_name} (Founder)"
    if company.ceo_name and company.ceo_name != "N/A":
        return f"Dear {company.ceo_name} (CEO)"
    if company.md_name and company.md_name != "N/A":
        return f"Dear {company.md_name} (Managing Director)"
    return f"Dear Leadership & Compliance Team"


def format_compliance_bullets(impacted_sectors: List[Any]) -> str:
    """Extracts up to 4 concrete action checklist items from AI impact analysis."""
    bullets = []
    for impact in impacted_sectors:
        actions = getattr(impact, "key_compliance_actions", [])
        if actions:
            for act in actions[:3]:
                if act and act not in bullets:
                    bullets.append(f"  • {act}")
    if not bullets:
        return (
            "  • Audit internal compliance policies against the newly published regulatory parameters.\n"
            "  • Validate capital adequacy, liquidity, and mandatory disclosure requirements.\n"
            "  • Submit formal attestations to the relevant regulatory portal within prescribed timelines."
        )
    return "\n".join(bullets[:4])


def build_subscribed_email(
    company: ImpactedCompany,
    update: RegulatoryUpdate,
    executive_summary: str,
    compliance_urgency: str,
    compliance_bullets: str
) -> Tuple[str, str]:
    """
    VIP Enterprise Client Advisory Template.
    Tone: Confidential, authoritative, privileged, zero sales pitch, high operational value.
    """
    salutation = get_recipient_salutation(company)
    tier = company.subscription_tier or "ACTIVE ENTERPRISE SUBSCRIBER"
    city = company.city if company.city and company.city != "N/A" else "Regional Hub"
    country = company.country if company.country else "Global"
    address = company.physical_address if company.physical_address and company.physical_address != "N/A" else (company.address or "Address on file")

    subject = f"[VIP COMPLIANCE ADVISORY] {update.board_name}: Immediate Action Required for {company.name}"

    body = f"""{salutation} at {company.name},

*** CONFIDENTIAL & PRIVILEGED REGULATORY INTELLIGENCE ***
Client Account:   {company.name}
Subscription:     {tier} [ACTIVE]
Surveillance:     24×7 Real-Time Surveillance Active

Our continuous 10-second regulatory radar sweep has detected a high-priority official release from {update.board_name} ({update.jurisdiction}) that impacts your operations in {city}, {country}.

================================================================================
1. OFFICIAL REGULATORY NOTICE DETAILS
================================================================================
Issuing Body:         {update.board_name}
Circular / Order:     {update.title}
Jurisdiction Hub:     {city}, {country}
Severity Level:       {update.severity}
Compliance Urgency:   {compliance_urgency}
Official Notice URL:  {update.url}

================================================================================
2. BESPOKE IMPACT & SECTOR EXPOSURE
================================================================================
Operating Sector:     {company.sector}
Entity Identified:    {company.name} ({company.domain})

Automated Risk Assessment:
{executive_summary}

================================================================================
3. RECOMMENDED COMPLIANCE ACTION PLAN
================================================================================
{compliance_bullets}

================================================================================
4. SUBSCRIBER PRIVILEGES & DIRECT ANALYST SUPPORT
================================================================================
As an active {tier} client:
• Your dedicated Guptchar Compliance Desk is already monitoring follow-up gazette notifications and amendments to this order.
• To request a customized corporate exposure breakdown or an emergency audit, simply reply directly to this dispatch.
• Review this notice alongside your SEC EDGAR and corporate records directly in your Guptchar Command Center.

Registered Office on Record:
{address}

Sincerely,
Guptchar Regulatory Surveillance & Automated Compliance Dispatch
Enterprise Client Desk • 24×7 Continuous Global Surveillance
"""
    return subject, body


def build_unsubscribed_email(
    company: ImpactedCompany,
    update: RegulatoryUpdate,
    executive_summary: str,
    compliance_urgency: str,
    compliance_bullets: str
) -> Tuple[str, str]:
    """
    Non-Subscribed Early-Warning Notice Template.
    Tone: Urgent, respectful, educational, demonstrating immediate tangible value with clear conversion CTA.
    """
    salutation = get_recipient_salutation(company)
    city = company.city if company.city and company.city != "N/A" else "Regional Hub"
    country = company.country if company.country else "Global"
    domain = company.domain if company.domain and company.domain != "N/A" else "target organization"
    address = company.physical_address if company.physical_address and company.physical_address != "N/A" else (company.address or "Address on file")

    subject = f"[REGULATORY EARLY-WARNING] {update.board_name}: Impact Notice for {company.name}"

    body = f"""{salutation} at {company.name},

*** AUTOMATED REGULATORY COMPLIANCE EARLY-WARNING NOTICE ***
Target Organization:  {company.name}
Operating Sector:     {company.sector}
Jurisdiction Hub:     {city}, {country}

During our continuous regulatory radar sweep across global authorities, our automated surveillance engine detected an official circular published by {update.board_name} ({update.jurisdiction}) that materially affects companies operating in your industry.

================================================================================
1. OFFICIAL REGULATORY NOTICE SUMMARY
================================================================================
Issuing Body:         {update.board_name}
Announcement Title:   {update.title}
Severity Level:       {update.severity}
Compliance Urgency:   {compliance_urgency}
Official Notice URL:  {update.url}

================================================================================
2. WHY {company.name.upper()} IS IMPACTED
================================================================================
Our OSINT discovery engine identified {company.name} ({domain}) as a key commercial entity operating within the {company.sector} sector in {city}, {country}.

Automated Impact Summary:
{executive_summary}

Preliminary Compliance Checkpoints:
{compliance_bullets}

================================================================================
3. ACTIVATE CONTINUOUS 24×7 REGULATORY SURVEILLANCE
================================================================================
This alert is a complimentary early-warning notice from the Guptchar Regulatory Intelligence framework.

Unsubscribed organizations do not receive:
• Automated real-time alerts across all 5 global authorities (SEBI, RBI, SEC, FCA, ESMA).
• Instant leadership SMS & WhatsApp alerts for high-severity emergency circulars.
• Bespoke SEC EDGAR filing verifications and human-reviewed advisory dispatching.

To activate continuous compliance protection for {company.name}, simply reply directly to this email.

Registered Service Address:
{address}

--------------------------------------------------------------------------------
Compliance & Privacy Notice: This single advisory was transmitted because {company.name} is a commercial entity in an active regulated jurisdiction. If you do not wish to receive complimentary regulatory alerts, reply with 'UNSUBSCRIBE' or contact privacy@guptchar.com to be permanently excluded.
--------------------------------------------------------------------------------
Guptchar Autonomous Regulatory Surveillance
Continuous 10-Second Global Multi-Board Monitoring
"""
    return subject, body


async def generate_email_dispatch(
    company: ImpactedCompany,
    update: RegulatoryUpdate,
    executive_summary: str,
    compliance_urgency: str,
    impacted_sectors: Optional[List[Any]] = None
) -> Tuple[str, str]:
    """
    Main router: Uses AI as primary intelligence driver if an AI API key is provided,
    generating bespoke executive impact and action points for the specific company,
    and falls back to high-fidelity structured templates.
    """
    bullets = format_compliance_bullets(impacted_sectors or [])
    is_sub = company.is_subscribed or (company.subscription_status == "SUBSCRIBED")

    # If AI API key is provided, use AI to generate tailored executive rationale & action plan
    try:
        from ai.llm_client import llm_client
        if llm_client.has_ai_api_key():
            ai_prompt = f"""
Given this official regulatory notice:
- Authority: {update.board_name} ({update.jurisdiction})
- Title: {update.title}
- Severity: {update.severity}
- URL: {update.url}

And this specific target commercial entity:
- Name: {company.name}
- Operating Sector: {company.sector}
- Jurisdiction Hub: {company.city}, {company.country}
- Subscription Tier: {"SUBSCRIBED VIP PARTNER" if is_sub else "NON-SUBSCRIBED PROSPECT"}

Generate a bespoke JSON response with:
1. "executive_summary": 2-3 precise sentences explaining why {company.name} in {company.city} is operationally affected.
2. "compliance_actions": A list of 3-4 specific, actionable compliance steps for their risk team.

Respond strictly with valid JSON:
{{"executive_summary": "...", "compliance_actions": ["...", "..."]}}
"""
            completion = await llm_client.generate_completion(
                prompt=ai_prompt,
                system_instruction="You are a senior financial compliance counsel. Provide authoritative, concise regulatory impact reasoning in JSON format.",
                temperature=0.1
            )
            if completion:
                import json
                cleaned = completion.strip().replace("```json", "").replace("```", "").strip()
                parsed = json.loads(cleaned)
                if parsed.get("executive_summary") and len(parsed["executive_summary"]) > 20:
                    executive_summary = parsed["executive_summary"]
                if parsed.get("compliance_actions") and isinstance(parsed["compliance_actions"], list):
                    bullets = "\n".join([f"  • {action}" for action in parsed["compliance_actions"][:4] if action])
    except Exception:
        # Fall back gracefully to base analysis values
        pass

    if is_sub:
        return build_subscribed_email(
            company=company,
            update=update,
            executive_summary=executive_summary,
            compliance_urgency=compliance_urgency,
            compliance_bullets=bullets
        )
    else:
        return build_unsubscribed_email(
            company=company,
            update=update,
            executive_summary=executive_summary,
            compliance_urgency=compliance_urgency,
            compliance_bullets=bullets
        )
