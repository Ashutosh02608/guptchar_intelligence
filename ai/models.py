"""
Pydantic Data Models for Regulatory Announcement Sector Impact Analysis.
"""

import time
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SectorCategory(str, Enum):
    BANKING = "Banking & Lending"
    NBFC = "NBFCs & Shadow Banking"
    FINTECH = "FinTech & Digital Payments"
    ASSET_MANAGEMENT = "Asset Management & Mutual Funds"
    CAPITAL_MARKETS = "Capital Markets, Brokers & Exchanges"
    INSURANCE = "Insurance & Reinsurance"
    CRYPTO_DIGITAL_ASSETS = "Crypto, Web3 & Digital Assets"
    REAL_ESTATE = "Real Estate, Infrastructure & REITs"
    IT_CYBERSECURITY = "IT, Cloud Infrastructure & Cybersecurity"
    DERIVATIVES_FOREX = "Derivatives, Forex & Commodities"
    CORPORATE_GOVERNANCE = "Corporate Governance & Cross-Industry"


class DirectionalBias(str, Enum):
    BULLISH = "BULLISH"               # Favorable deregulation, expansionary policy, subsidy
    BEARISH = "BEARISH"               # Restrictions, higher capital requirements, bans
    NEUTRAL = "NEUTRAL"               # Clarification, administrative amendment, routine return
    INCREASED_COMPLIANCE = "INCREASED_COMPLIANCE" # Higher OPEX, strict audit mandate
    DISRUPTIVE = "DISRUPTIVE"         # Structural business model change required


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"   # Immediate trading/lending halts, severe legal risk, systemic change
    HIGH = "HIGH"           # Substantial operational or capital buffer requirement
    MEDIUM = "MEDIUM"       # Moderate reporting or disclosure revisions
    LOW = "LOW"             # Minor procedural or wording tweaks


class ImpactHorizon(str, Enum):
    IMMEDIATE = "IMMEDIATE"       # Within 30 days
    SHORT_TERM = "SHORT_TERM"     # 1 to 6 months
    LONG_TERM = "LONG_TERM"       # 6+ months or multi-year phase-in


class SectorImpact(BaseModel):
    """Specific impact assessment for an individual industry sector."""
    sector: SectorCategory
    impact_score: float = Field(ge=1.0, le=10.0, description="Scale of 1 (negligible) to 10 (seismic industry transformation)")
    directional_bias: DirectionalBias
    severity: SeverityLevel
    horizon: ImpactHorizon = ImpactHorizon.SHORT_TERM
    rationale: str = Field(description="Detailed economic and operational reasoning for this sector's impact")
    affected_entities: List[str] = Field(default_factory=list, description="Examples of entities directly impacted (e.g., Public Sector Banks, Algo Trading Desks)")
    key_compliance_actions: List[str] = Field(default_factory=list, description="Specific actions the sector must undertake")


class AnnouncementAnalysis(BaseModel):
    """Complete synthesized AI intelligence breakdown of an incoming regulatory release."""
    model_config = {"protected_namespaces": ()}

    announcement_id: str
    title: str

    authority: str
    jurisdiction: str
    detected_at: float = Field(default_factory=time.time)
    analyzed_at: float = Field(default_factory=time.time)
    
    # Impact Analysis
    overall_impact_score: float = Field(ge=1.0, le=10.0, description="Overall systemic impact score from 1.0 to 10.0")
    primary_sector: SectorCategory = Field(description="The primary sector bearing the heaviest impact")
    impacted_sectors: List[SectorImpact] = Field(description="All sectors impacted by the announcement sorted by impact magnitude")
    
    # Narrative & Synthesis
    executive_summary: str = Field(description="2-3 sentence executive synopsis for Chief Risk Officers and Portfolio Managers")
    key_provisions: List[str] = Field(default_factory=list, description="Bullet-point extraction of core legal/regulatory mandates")
    compliance_urgency: str = Field(default="STANDARD_WINDOW", description="CRITICAL_IMMEDIATE, STANDARD_WINDOW, or INFORMATIONAL")
    effective_deadline: Optional[str] = Field(default=None, description="Reported implementation or grace period deadline")
    market_sentiment: str = Field(default="NEUTRAL", description="Expected short-term secondary market reaction")
    
    # System Metadata
    model_provider_used: str = Field(description="The model or engine that performed this analysis")
    latency_ms: Optional[float] = None
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)
    raw_response: Optional[Dict[str, Any]] = None
