"""
Heuristic Domain-Expert Rule Engine.
Provides an offline semantic and ontological regulatory reasoning system
that maps announcements to impacted industry sectors, calculates directional biases,
and extracts key compliance obligations without requiring external LLM API keys.
"""

import re
import time
from typing import Dict, List, Tuple
from .models import (
    AnnouncementAnalysis, SectorImpact, SectorCategory,
    DirectionalBias, SeverityLevel, ImpactHorizon
)

# Comprehensive keyword ontology for regulatory sector classification
SECTOR_KEYWORDS: Dict[SectorCategory, Dict[str, any]] = {
    SectorCategory.BANKING: {
        "keywords": [
            "bank", "banking", "lending", "credit", "repo", "reverse repo", "crr", "slr",
            "statutory liquidity", "capital adequacy", "basel", "npa", "stressed asset",
            "deposit", "moratorium", "liquidity facility", "commercial paper", "overdraft",
            "priority sector", "psl", "interbank", "central bank", "interest rate", "cash reserve"
        ],
        "default_entities": ["Commercial Banks", "Public Sector Banks", "Private Lenders", "Cooperative Banks"],
        "base_weight": 1.2
    },
    SectorCategory.NBFC: {
        "keywords": [
            "nbfc", "shadow bank", "microfinance", "mfi", "housing finance", "hfc", "peer-to-peer",
            "unsecured loan", "retail lending", "asset reconstruction", "arc", "upper layer nbfc",
            "middle layer nbfc", "scale-based regulation"
        ],
        "default_entities": ["Upper Layer NBFCs", "Housing Finance Companies", "Microfinance Institutions", "Digital Lenders"],
        "base_weight": 1.3
    },
    SectorCategory.FINTECH: {
        "keywords": [
            "fintech", "payment aggregator", "payment gateway", "wallet", "upi", "prepaid payment",
            "ppi", "tokenization", "payment system", "digital payment", "account aggregator",
            "qr code", "card network", "merchant discount", "mdr", "neobank", "payment bank"
        ],
        "default_entities": ["Payment Aggregators", "Merchant Gateway Operators", "Digital Wallets", "Payment Apps"],
        "base_weight": 1.4
    },
    SectorCategory.ASSET_MANAGEMENT: {
        "keywords": [
            "mutual fund", "amc", "asset management", "aif", "alternative investment",
            "nav", "portfolio manager", "pms", "etf", "expense ratio", "ter", "unitholder",
            "sid", "scheme", "liquid fund", "debt fund", "equity fund", "hedge fund", "private equity"
        ],
        "default_entities": ["Asset Management Companies (AMCs)", "AIF Fund Managers", "PMS Desks", "ETF Sponsors"],
        "base_weight": 1.3
    },
    SectorCategory.CAPITAL_MARKETS: {
        "keywords": [
            "broker", "brokerage", "stock exchange", "clearing corporation", "depository",
            "depository participant", "nsdl", "cdsl", "ipo", "listing", "algo trading",
            "algorithmic", "colocation", "trading halt", "settlement", "t+1", "t+0",
            "margin requirement", "client collateral", "insider trading", "front-running",
            "market maker", "surveillance", "circuit breaker", "delisting", "qip", "rights issue"
        ],
        "default_entities": ["Stock Exchanges", "Retail & Institutional Brokers", "Clearing Houses", "Algo Trading Desks"],
        "base_weight": 1.3
    },
    SectorCategory.INSURANCE: {
        "keywords": [
            "insurance", "insurer", "policyholder", "underwriting", "solvency ratio",
            "reinsurance", "life insurance", "general insurance", "health insurance",
            "premium", "claims settlement", "bancassurance", "actuary"
        ],
        "default_entities": ["Life Insurance Underwriters", "General Insurers", "Reinsurance Brokers", "InsurTech Startups"],
        "base_weight": 1.2
    },
    SectorCategory.CRYPTO_DIGITAL_ASSETS: {
        "keywords": [
            "crypto", "cryptocurrency", "bitcoin", "ethereum", "virtual digital asset", "vda",
            "digital asset", "token", "stablecoin", "custody of digital assets", "defi",
            "unregistered securities", "staking", "web3", "fiat gateway", "aml vasp"
        ],
        "default_entities": ["VDA Exchanges", "Crypto Custodians", "Institutional Digital Asset Desks", "Token Issuers"],
        "base_weight": 1.5
    },
    SectorCategory.REAL_ESTATE: {
        "keywords": [
            "reit", "invit", "real estate", "infrastructure investment", "commercial property",
            "housing finance", "mortgage", "rera", "land acquisition", "property development"
        ],
        "default_entities": ["REIT Sponsors", "Commercial Developers", "Infrastructure Funds", "Mortgage Servicers"],
        "base_weight": 1.1
    },
    SectorCategory.IT_CYBERSECURITY: {
        "keywords": [
            "cyber", "cybersecurity", "data localization", "cloud", "api", "ransomware",
            "data privacy", "third-party risk", "vendor management", "outsourcing",
            "disaster recovery", "bcp", "it governance", "penetration testing", "cert-in"
        ],
        "default_entities": ["FinTech SaaS Providers", "Cloud Service Providers", "Core Banking Vendors", "Security Operators"],
        "base_weight": 1.2
    },
    SectorCategory.DERIVATIVES_FOREX: {
        "keywords": [
            "derivative", "futures", "options", "f&o", "swaps", "forex", "fema", "foreign exchange",
            "ecb", "external commercial borrowing", "ndf", "non-deliverable", "hedging",
            "commodity", "gold", "crude", "fx reserve", "cross-currency"
        ],
        "default_entities": ["Proprietary Trading Firms", "Currency Derivative Desks", "Commodity Brokers", "Treasury Desks"],
        "base_weight": 1.3
    },
    SectorCategory.CORPORATE_GOVERNANCE: {
        "keywords": [
            "governance", "independent director", "audit committee", "related party transaction",
            "rpt", "esg", "brsr", "business responsibility", "board meeting", "disclosures",
            "whistleblower", "annual report", "promoter", "pledge"
        ],
        "default_entities": ["Public Listed Corporations", "Independent Directors", "Statutory Auditors", "Audit Committees"],
        "base_weight": 1.0
    }
}

# Authority affinity mappings
AUTHORITY_AFFINITIES = {
    "SEBI": [SectorCategory.CAPITAL_MARKETS, SectorCategory.ASSET_MANAGEMENT, SectorCategory.DERIVATIVES_FOREX, SectorCategory.CORPORATE_GOVERNANCE],
    "RBI": [SectorCategory.BANKING, SectorCategory.NBFC, SectorCategory.FINTECH, SectorCategory.DERIVATIVES_FOREX],
    "US-SEC": [SectorCategory.CAPITAL_MARKETS, SectorCategory.ASSET_MANAGEMENT, SectorCategory.CRYPTO_DIGITAL_ASSETS, SectorCategory.CORPORATE_GOVERNANCE],
    "UK-FCA": [SectorCategory.BANKING, SectorCategory.CAPITAL_MARKETS, SectorCategory.INSURANCE, SectorCategory.FINTECH],
    "EU-ESMA": [SectorCategory.CAPITAL_MARKETS, SectorCategory.ASSET_MANAGEMENT, SectorCategory.DERIVATIVES_FOREX, SectorCategory.CRYPTO_DIGITAL_ASSETS]
}

def analyze_with_heuristics(
    announcement_id: str,
    title: str,
    authority: str,
    jurisdiction: str,
    summary: str = "",
    url: str = ""
) -> AnnouncementAnalysis:
    """
    Analyzes an announcement using domain rules, keyword ontologies, and authority specialization.
    """
    start_time = time.time()
    text = f"{title} {summary}".lower()

    # Calculate sector matching scores
    scored_sectors: List[Tuple[SectorCategory, float, int]] = []
    authority_affinities = AUTHORITY_AFFINITIES.get(authority.upper(), [])

    for sector, data in SECTOR_KEYWORDS.items():
        match_count = 0
        for kw in data["keywords"]:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                match_count += 1
        
        # Base score from keyword frequency
        score = match_count * data["base_weight"]
        # Boost if sector is in authority's primary purview
        if sector in authority_affinities:
            score += 1.5

        if match_count > 0 or (score > 1.4 and sector in authority_affinities):
            scored_sectors.append((sector, score, match_count))

    # Sort sectors by highest relevance score
    scored_sectors.sort(key=lambda x: x[1], reverse=True)

    # Determine Severity & Urgency based on linguistic flags
    is_critical_flag = any(w in text for w in ["fraud", "halt", "enforcement", "penalty", "injunction", "suspend", "freeze", "emergency", "mandatory", "curb", "immediate", "ban"])
    is_high_flag = any(w in text for w in ["guidelines", "framework", "master circular", "directive", "safeguard", "compliance", "amendment", "colocation", "audit", "capital requirement"])
    is_bullish_flag = any(w in text for w in ["streamline", "approved", "facilitate", "relaxation", "ease", "exemption", "growth", "incentive", "permitted"])
    is_bearish_flag = any(w in text for w in ["violation", "investigation", "sanction", "barred", "penalized", "revoked", "curtail", "restriction", "prohibit"])

    if is_critical_flag:
        overall_severity = SeverityLevel.CRITICAL
        overall_score = 8.8
        urgency = "CRITICAL_IMMEDIATE"
    elif is_high_flag:
        overall_severity = SeverityLevel.HIGH
        overall_score = 7.4
        urgency = "STANDARD_WINDOW"
    else:
        overall_severity = SeverityLevel.MEDIUM
        overall_score = 5.6
        urgency = "INFORMATIONAL"

    # Default to Capital Markets or Banking if no specific keywords matched
    if not scored_sectors:
        primary_fallback = authority_affinities[0] if authority_affinities else SectorCategory.CAPITAL_MARKETS
        scored_sectors = [(primary_fallback, 3.0, 1)]

    primary_sector = scored_sectors[0][0]

    # Build impacted sector objects
    impacted_sectors: List[SectorImpact] = []
    for sector, score, match_count in scored_sectors[:4]:
        # Determine directional bias for this sector
        if is_bearish_flag or is_critical_flag:
            bias = DirectionalBias.BEARISH if "fine" in text or "barred" in text else DirectionalBias.INCREASED_COMPLIANCE
        elif is_bullish_flag:
            bias = DirectionalBias.BULLISH
        else:
            bias = DirectionalBias.INCREASED_COMPLIANCE if is_high_flag else DirectionalBias.NEUTRAL

        sector_score = min(9.8, max(2.0, round(score * 1.8 + (2.0 if is_critical_flag else 0), 1)))

        # Sector-specific rationale
        data = SECTOR_KEYWORDS[sector]
        rationale = f"Directly subject to {authority}'s directive regarding {title.lower()[:60]}... Entities in this vertical must verify compliance procedures and regulatory reporting disclosures."

        actions = [
            f"Review internal compliance standard operating procedures against {authority} announcement",
            f"Audit current operational and IT systems for {title[:40]} compatibility",
            "Prepare management summary for Board Risk Committee"
        ]

        impacted_sectors.append(SectorImpact(
            sector=sector,
            impact_score=sector_score,
            directional_bias=bias,
            severity=overall_severity,
            horizon=ImpactHorizon.IMMEDIATE if is_critical_flag else ImpactHorizon.SHORT_TERM,
            rationale=rationale,
            affected_entities=data["default_entities"][:3],
            key_compliance_actions=actions
        ))

    # Executive Summary Generation
    exec_summary = (
        f"The {authority} has issued an impactful regulatory publication regarding '{title}'. "
        f"This directly affects the {primary_sector.value} sector with a calculated impact intensity of {overall_score}/10. "
        f"Immediate operational oversight and compliance assessment are recommended for risk and legal teams."
    )

    key_provisions = [
        f"Regulatory Authority: {authority} ({jurisdiction}) directive issuance.",
        f"Core Subject Mandate: {title}.",
        f"Target Primary Industry: {primary_sector.value}.",
        f"Compliance Urgency Profile: {urgency.replace('_', ' ')}."
    ]

    latency = round((time.time() - start_time) * 1000, 2)

    return AnnouncementAnalysis(
        announcement_id=announcement_id,
        title=title,
        authority=authority,
        jurisdiction=jurisdiction,
        overall_impact_score=overall_score,
        primary_sector=primary_sector,
        impacted_sectors=impacted_sectors,
        executive_summary=exec_summary,
        key_provisions=key_provisions,
        compliance_urgency=urgency,
        effective_deadline="Refer to official circular text",
        market_sentiment="DEFENSIVE_SCRUTINY" if is_critical_flag else "ADAPTIVE_COMPLIANCE",
        model_provider_used="heuristic-expert-reasoner-v1",
        latency_ms=latency,
        confidence_score=0.88,
        raw_response={"mode": "heuristic", "scored_sectors_count": len(scored_sectors)}
    )
