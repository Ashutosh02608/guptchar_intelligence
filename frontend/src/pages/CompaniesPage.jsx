import React, { useState, useEffect } from "react";
import { 
  Building, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Users, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  RotateCw, 
  Briefcase, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  ChevronRight,
  Edit3,
  Save,
  Check,
  AlertTriangle,
  Award
} from "lucide-react";
import { API_BASE as DEFAULT_API_BASE } from "../utils/config";

export function CompaniesPage({ API_BASE = DEFAULT_API_BASE }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubscribed, setFilterSubscribed] = useState("ALL"); // "ALL", "SUBSCRIBED", "UNSUBSCRIBED"
  const [filterCountry, setFilterCountry] = useState("ALL");
  const [filterSector, setFilterSector] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Verification states
  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationReport, setVerificationReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const loadVerificationReport = async (comp) => {
    if (comp.verification_report_json && comp.verification_report_json !== "{}") {
      try {
        setVerificationReport(typeof comp.verification_report_json === "string" ? JSON.parse(comp.verification_report_json) : comp.verification_report_json);
        return;
      } catch (e) {
        // Fall back to API
      }
    }
    setLoadingReport(true);
    try {
      const res = await fetch(`${API_BASE}/api/companies/${comp.id}/verification-report`);
      if (res.ok) {
        const data = await res.json();
        setVerificationReport(data);
      }
    } catch (e) {
      console.error("Failed to load report", e);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleVerifyCompany = async (comp, e) => {
    if (e) e.stopPropagation();
    setVerifyingId(comp.id);
    try {
      const res = await fetch(`${API_BASE}/api/companies/${comp.id}/verify`, {
        method: "POST"
      });
      if (res.ok) {
        const report = await res.json();
        setVerificationReport(report);
        const updated = {
          ...comp,
          trust_score: report.trust_score,
          verification_status: report.confidence_level === "HIGH_CONFIDENCE" ? "VERIFIED" : (report.confidence_level === "MODERATE_CONFIDENCE" ? "PARTIALLY_VERIFIED" : "FLAGGED"),
          verified_at: report.verified_at,
          verification_report_json: JSON.stringify(report)
        };
        setCompanies(prev => prev.map(c => c.id === comp.id ? { ...c, ...updated } : c));
        if (selectedCompany && selectedCompany.id === comp.id) {
          setSelectedCompany(prev => ({ ...prev, ...updated }));
        }
      }
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleOpenModal = (comp) => {
    setSelectedCompany(comp);
    setIsEditing(false);
    setSaveSuccessMsg("");
    loadVerificationReport(comp);
    setEditForm({
      name: comp.name || "",
      country: comp.country || "India",
      state: comp.state && comp.state !== "N/A" ? comp.state : "",
      city: comp.city && comp.city !== "N/A" ? comp.city : "",
      pincode: comp.pincode && comp.pincode !== "N/A" ? comp.pincode : "",
      address: comp.address && comp.address !== "N/A" ? comp.address : (comp.physical_address && comp.physical_address !== "N/A" ? comp.physical_address : ""),
      sector: comp.sector || "",
      domain: comp.domain && comp.domain !== "N/A" ? comp.domain : "",
      company_email: comp.company_email && comp.company_email !== "N/A" ? comp.company_email : (comp.primary_email && comp.primary_email !== "N/A" ? comp.primary_email : ""),
      company_phone: comp.company_phone && comp.company_phone !== "N/A" ? comp.company_phone : (comp.phone && comp.phone !== "N/A" ? comp.phone : ""),
      founder_name: comp.founder_name && comp.founder_name !== "N/A" ? comp.founder_name : "",
      founder_email: comp.founder_email && comp.founder_email !== "N/A" ? comp.founder_email : "",
      founder_phone: comp.founder_phone && comp.founder_phone !== "N/A" ? comp.founder_phone : "",
      ceo_name: comp.ceo_name && comp.ceo_name !== "N/A" ? comp.ceo_name : "",
      ceo_email: comp.ceo_email && comp.ceo_email !== "N/A" ? comp.ceo_email : "",
      ceo_phone: comp.ceo_phone && comp.ceo_phone !== "N/A" ? comp.ceo_phone : "",
      md_name: comp.md_name && comp.md_name !== "N/A" ? comp.md_name : "",
      md_email: comp.md_email && comp.md_email !== "N/A" ? comp.md_email : "",
      md_phone: comp.md_phone && comp.md_phone !== "N/A" ? comp.md_phone : ""
    });
  };

  const handleAutoFillHub = () => {
    const c = (editForm.city || "").trim().toLowerCase();
    let detectedState = "";
    let detectedPin = "";
    let detectedCountry = editForm.country || "India";

    if (c.includes("mumbai") || c.includes("bombay")) {
      detectedState = "Maharashtra";
      detectedPin = "400051";
    } else if (c.includes("bengaluru") || c.includes("bangalore")) {
      detectedState = "Karnataka";
      detectedPin = "560001";
    } else if (c.includes("delhi")) {
      detectedState = "Delhi";
      detectedPin = "110001";
    } else if (c.includes("hyderabad")) {
      detectedState = "Telangana";
      detectedPin = "500081";
    } else if (c.includes("chennai") || c.includes("madras")) {
      detectedState = "Tamil Nadu";
      detectedPin = "600001";
    } else if (c.includes("pune")) {
      detectedState = "Maharashtra";
      detectedPin = "411001";
    } else if (c.includes("gurugram") || c.includes("gurgaon")) {
      detectedState = "Haryana";
      detectedPin = "122002";
    } else if (c.includes("noida")) {
      detectedState = "Uttar Pradesh";
      detectedPin = "201301";
    } else if (c.includes("kolkata") || c.includes("calcutta")) {
      detectedState = "West Bengal";
      detectedPin = "700001";
    } else if (c.includes("ahmedabad")) {
      detectedState = "Gujarat";
      detectedPin = "380015";
    } else if (c.includes("london")) {
      detectedState = "Greater London";
      detectedPin = "EC2N";
      detectedCountry = "United Kingdom";
    } else if (c.includes("new york")) {
      detectedState = "New York";
      detectedPin = "10005";
      detectedCountry = "United States";
    } else if (c.includes("singapore")) {
      detectedState = "Central Region";
      detectedPin = "048581";
      detectedCountry = "Singapore";
    }

    setEditForm(prev => ({
      ...prev,
      country: detectedCountry,
      state: detectedState || prev.state,
      pincode: detectedPin || prev.pincode
    }));
  };

  const handleSaveProfile = async () => {
    if (!selectedCompany) return;
    setSavingProfile(true);
    setSaveSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/companies/${selectedCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedCompany(updated);
        setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
        setIsEditing(false);
        setSaveSuccessMsg("Successfully saved & synced live to Neon PostgreSQL!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/companies?limit=200`;
      if (filterSubscribed === "SUBSCRIBED") url += "&is_subscribed=true";
      else if (filterSubscribed === "UNSUBSCRIBED") url += "&is_subscribed=false";
      if (filterCountry !== "ALL") url += `&country=${encodeURIComponent(filterCountry)}`;
      if (filterSector !== "ALL") url += `&sector=${encodeURIComponent(filterSector)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error("Failed to load companies:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [filterSubscribed, filterCountry, filterSector]);

  const handleToggleSubscription = async (comp, e) => {
    e.stopPropagation();
    setUpdatingId(comp.id);
    const newStatus = !comp.is_subscribed;
    try {
      const res = await fetch(`${API_BASE}/api/companies/${comp.id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_subscribed: newStatus,
          subscription_tier: newStatus ? "ACTIVE_SUBSCRIBER" : "UNSUBSCRIBED"
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setCompanies(prev => prev.map(c => c.id === comp.id ? updated : c));
        if (selectedCompany && selectedCompany.id === comp.id) {
          setSelectedCompany(updated);
        }
      }
    } catch (err) {
      console.error("Failed to update subscription:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter with search query
  const filteredCompanies = companies.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (c.name || "").toLowerCase().includes(q);
    const matchCity = (c.city || "").toLowerCase().includes(q);
    const matchSector = (c.sector || "").toLowerCase().includes(q);
    const matchFounder = (c.founder_name || "").toLowerCase().includes(q);
    const matchCeo = (c.ceo_name || "").toLowerCase().includes(q);
    const matchMd = (c.md_name || "").toLowerCase().includes(q);
    return matchName || matchCity || matchSector || matchFounder || matchCeo || matchMd;
  });

  const totalCount = companies.length;
  const subscribedCount = companies.filter(c => c.is_subscribed).length;
  const unsubscribedCount = totalCount - subscribedCount;

  // Extract unique sectors and countries
  const sectors = Array.from(new Set(companies.map(c => c.sector).filter(Boolean)));
  const countries = Array.from(new Set(companies.map(c => c.country).filter(Boolean)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Top Banner & KPI Metrics */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Building style={{ color: "var(--neon-emerald)", width: "18px", height: "18px" }} />
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                Company Intelligence & Executive CRM
              </h2>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 46px" }}>
              Country-organized database for companies, addresses, postal codes, Founders, CEOs, MDs, and subscription tracking.
            </p>
          </div>

          <button
            onClick={fetchCompanies}
            disabled={loading}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              padding: "7px 14px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.78rem"
            }}
          >
            <RotateCw size={14} className={loading ? "spin" : ""} />
            Sync Database
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "14px"
        }}>
          <div style={{
            background: "rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "10px",
            padding: "14px 16px"
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
              Tracked Companies
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
              {totalCount}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--neon-cyan)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={12} /> Persisted & Deduplicated
            </div>
          </div>

          <div style={{
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "10px",
            padding: "14px 16px"
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--neon-emerald)", textTransform: "uppercase", fontWeight: "600" }}>
              Subscribed Clients
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: "800", color: "var(--neon-emerald)", marginTop: "4px" }}>
              {subscribedCount}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Active Regulatory Advisory Tier
            </div>
          </div>

          <div style={{
            background: "rgba(245, 158, 11, 0.06)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "14px 16px"
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--neon-amber)", textTransform: "uppercase", fontWeight: "600" }}>
              Unsubscribed Prospects
            </div>
            <div style={{ fontSize: "1.7rem", fontWeight: "800", color: "var(--neon-amber)", marginTop: "4px" }}>
              {unsubscribedCount}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Target for Advisory Outreach
            </div>
          </div>

          <div style={{
            background: "rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "10px",
            padding: "14px 16px"
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
              Active Cloud Storage
            </div>
            <div style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Neon PostgreSQL Connected</span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--neon-emerald)", marginTop: "6px" }}>
              countries_companies_view active
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: "14px 20px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          {/* Subscription Status Filter Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginRight: "4px" }}>Status:</span>
            {[
              { id: "ALL", label: `All (${totalCount})` },
              { id: "SUBSCRIBED", label: `Subscribed (${subscribedCount})`, color: "var(--neon-emerald)" },
              { id: "UNSUBSCRIBED", label: `Unsubscribed (${unsubscribedCount})`, color: "var(--neon-amber)" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterSubscribed(tab.id)}
                style={{
                  background: filterSubscribed === tab.id ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.3)",
                  border: filterSubscribed === tab.id ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid rgba(255, 255, 255, 0.06)",
                  color: filterSubscribed === tab.id && tab.color ? tab.color : (filterSubscribed === tab.id ? "#fff" : "var(--text-muted)"),
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  fontWeight: filterSubscribed === tab.id ? "600" : "400",
                  cursor: "pointer"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Country, Sector & Search Inputs */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {countries.length > 0 && (
              <select
                value={filterCountry}
                onChange={e => setFilterCountry(e.target.value)}
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  color: "#fff",
                  padding: "6px 10px",
                  fontSize: "0.75rem"
                }}
              >
                <option value="ALL">All Countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {sectors.length > 0 && (
              <select
                value={filterSector}
                onChange={e => setFilterSector(e.target.value)}
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  color: "#fff",
                  padding: "6px 10px",
                  fontSize: "0.75rem"
                }}
              >
                <option value="ALL">All Sectors</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <div style={{ position: "relative", minWidth: "min(100%, 220px)", flex: "1 1 200px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "var(--text-dim)" }} />
              <input
                type="text"
                placeholder="Search company, founder, CEO, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "6px 10px 6px 30px",
                  fontSize: "0.76rem",
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <RotateCw size={24} className="spin" style={{ margin: "0 auto 12px" }} />
          <p>Querying verified corporate entities and executive leadership...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="glass-panel" style={{ padding: "50px 20px", textAlign: "center" }}>
          <Building size={36} style={{ color: "var(--text-dim)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "6px" }}>No Corporate Entities Found</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto" }}>
            When circulars are evaluated by the AI Engine, the Extractor will discover, deduplicate, and catalog companies with their Founders, CEOs, MDs, and subscription status.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          {filteredCompanies.map(comp => {
            const hasFounder = comp.founder_name && comp.founder_name !== "N/A";
            const hasCeo = comp.ceo_name && comp.ceo_name !== "N/A";
            const hasMd = comp.md_name && comp.md_name !== "N/A";
            const isUpdating = updatingId === comp.id;

            return (
              <div
                key={comp.id}
                className="glass-panel"
                onClick={() => handleOpenModal(comp)}
                style={{
                  padding: "18px 20px",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                  border: comp.is_subscribed 
                    ? "1px solid rgba(16, 185, 129, 0.28)" 
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: comp.is_subscribed 
                    ? "linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, rgba(11, 17, 33, 0.8) 100%)" 
                    : "rgba(11, 17, 33, 0.8)"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--neon-cyan)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = comp.is_subscribed ? "rgba(16, 185, 129, 0.28)" : "rgba(255, 255, 255, 0.08)"}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  {/* Company Identity */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: "min(100%, 240px)" }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "10px",
                      background: comp.is_subscribed ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                      border: comp.is_subscribed ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Building size={20} style={{ color: comp.is_subscribed ? "var(--neon-emerald)" : "var(--text-muted)" }} />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                          {comp.name}
                        </h3>

                        {/* Subscription Column Badge */}
                        <span className="badge" style={{
                          background: comp.is_subscribed ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.12)",
                          color: comp.is_subscribed ? "var(--neon-emerald)" : "var(--text-muted)",
                          border: `1px solid ${comp.is_subscribed ? "rgba(16, 185, 129, 0.4)" : "rgba(148, 163, 184, 0.2)"}`,
                          fontSize: "0.68rem",
                          fontWeight: "700"
                        }}>
                          {comp.is_subscribed ? "SUBSCRIBED" : "NOT SUBSCRIBED"}
                        </span>

                        {/* Trust Score Badge */}
                        {comp.trust_score !== undefined && comp.trust_score !== null && comp.trust_score > 0 ? (
                          <span className="badge" style={{
                            background: comp.trust_score >= 80 ? "rgba(16, 185, 129, 0.15)" : comp.trust_score >= 50 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: comp.trust_score >= 80 ? "var(--neon-emerald)" : comp.trust_score >= 50 ? "var(--neon-amber)" : "var(--neon-rose)",
                            border: `1px solid ${comp.trust_score >= 80 ? "rgba(16, 185, 129, 0.4)" : comp.trust_score >= 50 ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
                            fontSize: "0.68rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            <ShieldCheck size={11} /> {comp.trust_score}% Trust
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--text-dim)", border: "1px solid rgba(255, 255, 255, 0.1)", fontSize: "0.68rem" }}>
                            Unverified
                          </span>
                        )}

                        {/* Country Tag Badge */}
                        <span className="badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#fff", fontSize: "0.68rem" }}>
                          {comp.country || "GLOBAL"}
                        </span>

                        <span className="badge" style={{ background: "rgba(6, 182, 212, 0.12)", color: "var(--neon-cyan)", fontSize: "0.68rem" }}>
                          {comp.sector}
                        </span>
                      </div>

                      {/* Address, City, State, Pincode */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: "var(--text-main)", marginTop: "6px", flexWrap: "wrap" }}>
                        <MapPin size={12} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
                        <span>
                          {comp.address && comp.address !== "N/A" ? comp.address : comp.city}
                          {comp.state && comp.state !== "N/A" ? `, ${comp.state}` : ""}
                          {comp.pincode && comp.pincode !== "N/A" ? ` - ${comp.pincode}` : ""}
                          {comp.country && comp.country !== "N/A" ? `, ${comp.country}` : ""}
                        </span>
                      </div>

                      {/* Contact & Domain */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", flexWrap: "wrap" }}>
                        {comp.domain && comp.domain !== "N/A" && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Globe size={12} /> {comp.domain}
                          </span>
                        )}
                        {(comp.company_email || comp.primary_email) && (comp.company_email || comp.primary_email) !== "N/A" && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-main)" }}>
                            <Mail size={12} /> {comp.company_email || comp.primary_email}
                          </span>
                        )}
                        {(comp.company_phone || comp.phone) && (comp.company_phone || comp.phone) !== "N/A" && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Phone size={12} /> {comp.company_phone || comp.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subscription Toggle Switch Button */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={(e) => handleToggleSubscription(comp, e)}
                      disabled={isUpdating}
                      style={{
                        background: comp.is_subscribed ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                        border: comp.is_subscribed ? "1px solid rgba(16, 185, 129, 0.5)" : "1px solid rgba(255, 255, 255, 0.15)",
                        color: comp.is_subscribed ? "var(--neon-emerald)" : "var(--text-muted)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.74rem",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                    >
                      {comp.is_subscribed ? (
                        <>
                          <CheckCircle size={14} style={{ color: "var(--neon-emerald)" }} />
                          Subscribed
                        </>
                      ) : (
                        <>
                          <XCircle size={14} style={{ color: "var(--text-dim)" }} />
                          Mark Subscribed
                        </>
                      )}
                    </button>

                    {/* Quick 1-Click Verification Trigger */}
                    <button
                      onClick={(e) => handleVerifyCompany(comp, e)}
                      disabled={verifyingId === comp.id}
                      title="Run live automated authenticity verification"
                      style={{
                        background: "rgba(6, 182, 212, 0.12)",
                        border: "1px solid rgba(6, 182, 212, 0.35)",
                        color: "var(--neon-cyan)",
                        padding: "6px 11px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.72rem",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                    >
                      <ShieldCheck size={13} className={verifyingId === comp.id ? "spin" : ""} />
                      {verifyingId === comp.id ? "Auditing..." : "Verify"}
                    </button>

                    <ChevronRight size={18} style={{ color: "var(--text-dim)" }} />
                  </div>
                </div>

                {/* Key Leadership Row (Founder / CEO / MD with Email & Phone) */}
                <div style={{
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                  gap: "10px"
                }}>
                  {/* Founder / Co-Founder */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.22)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)"
                  }}>
                    <div style={{ fontSize: "0.66rem", color: "var(--neon-cyan)", fontWeight: "700", textTransform: "uppercase" }}>
                      Founder / Co-Founder
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "600", color: hasFounder ? "#fff" : "var(--text-dim)", marginTop: "2px" }}>
                      {comp.founder_name || "N/A"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "3px" }}>
                      {comp.founder_email && comp.founder_email !== "N/A" && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Mail size={10} /> {comp.founder_email}
                        </div>
                      )}
                      {comp.founder_phone && comp.founder_phone !== "N/A" && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={10} /> {comp.founder_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chief Executive Officer (CEO) */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.22)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)"
                  }}>
                    <div style={{ fontSize: "0.66rem", color: "var(--neon-emerald)", fontWeight: "700", textTransform: "uppercase" }}>
                      Chief Executive Officer (CEO)
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "600", color: hasCeo ? "#fff" : "var(--text-dim)", marginTop: "2px" }}>
                      {comp.ceo_name || "N/A"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "3px" }}>
                      {comp.ceo_email && comp.ceo_email !== "N/A" && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Mail size={10} /> {comp.ceo_email}
                        </div>
                      )}
                      {comp.ceo_phone && comp.ceo_phone !== "N/A" && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={10} /> {comp.ceo_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Managing Director (MD) */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.22)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                    border: "1px solid rgba(255, 255, 255, 0.04)"
                  }}>
                    <div style={{ fontSize: "0.66rem", color: "var(--neon-amber)", fontWeight: "700", textTransform: "uppercase" }}>
                      Managing Director (MD)
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "600", color: hasMd ? "#fff" : "var(--text-dim)", marginTop: "2px" }}>
                      {comp.md_name || "N/A"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "3px" }}>
                      {comp.md_email && comp.md_email !== "N/A" && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Mail size={10} /> {comp.md_email}
                        </div>
                      )}
                      {comp.md_phone && comp.md_phone !== "N/A" && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Phone size={10} /> {comp.md_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Officers Count Indicator */}
                  {comp.executives && comp.executives.length > 0 && (
                    <div style={{
                      background: "rgba(0, 0, 0, 0.22)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid rgba(255, 255, 255, 0.04)"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.66rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                          Total Officers
                        </div>
                        <div style={{ fontSize: "0.88rem", fontWeight: "700", color: "#fff", marginTop: "2px" }}>
                          {comp.executives.length} Verified
                        </div>
                      </div>
                      <Users size={16} style={{ color: "var(--text-dim)" }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Company Details Modal */}
      {selectedCompany && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.78)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "10px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "780px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: "16px",
            background: "rgba(11, 17, 33, 0.95)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px",
                  background: selectedCompany.is_subscribed ? "rgba(16, 185, 129, 0.2)" : "rgba(6, 182, 212, 0.15)",
                  border: `1px solid ${selectedCompany.is_subscribed ? "rgba(16, 185, 129, 0.4)" : "rgba(6, 182, 212, 0.3)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Building size={20} style={{ color: selectedCompany.is_subscribed ? "var(--neon-emerald)" : "var(--neon-cyan)" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                    {selectedCompany.name}
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                    {selectedCompany.sector} • {selectedCompany.city}, {selectedCompany.country}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={(e) => handleVerifyCompany(selectedCompany, e)}
                  disabled={verifyingId === selectedCompany.id}
                  style={{
                    background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(16, 185, 129, 0.25))",
                    border: "1px solid var(--neon-cyan)",
                    color: "#fff",
                    padding: "6px 13px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    boxShadow: "0 0 12px rgba(6, 182, 212, 0.25)",
                    transition: "all 0.2s"
                  }}
                >
                  <ShieldCheck size={14} className={verifyingId === selectedCompany.id ? "spin" : ""} />
                  {verifyingId === selectedCompany.id ? "Auditing Live..." : "🛡️ Verify Authenticity"}
                </button>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: isEditing ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    border: isEditing ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.15)",
                    color: isEditing ? "var(--neon-cyan)" : "#fff",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                >
                  <Edit3 size={13} />
                  {isEditing ? "View Dossier" : "Edit / Enrich Dossier"}
                </button>

                <button
                  onClick={() => setSelectedCompany(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: "1.1rem"
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Success Notification */}
              {saveSuccessMsg && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  color: "var(--neon-emerald)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Check size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* EDIT MODE FORM */}
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(6, 182, 212, 0.08)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    padding: "10px 14px",
                    borderRadius: "8px"
                  }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--neon-cyan)", fontWeight: "600" }}>
                      📝 Editing Corporate Dossier (Syncs live to Neon PostgreSQL)
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoFillHub}
                      style={{
                        background: "rgba(6, 182, 212, 0.2)",
                        border: "1px solid var(--neon-cyan)",
                        color: "#fff",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Sparkles size={12} /> Auto-Detect State & PIN
                    </button>
                  </div>

                  {/* Section 1: Address & Geodata */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "16px"
                  }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#fff", textTransform: "uppercase", marginBottom: "12px" }}>
                      📍 Geographical & Postal Address
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Country</label>
                        <input
                          type="text"
                          value={editForm.country || ""}
                          onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>City</label>
                        <input
                          type="text"
                          value={editForm.city || ""}
                          onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>State</label>
                        <input
                          type="text"
                          value={editForm.state || ""}
                          placeholder="e.g. Maharashtra"
                          onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Pincode / Postal Code</label>
                        <input
                          type="text"
                          value={editForm.pincode || ""}
                          placeholder="e.g. 400051"
                          onChange={e => setEditForm({ ...editForm, pincode: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem", color: "var(--neon-cyan)", fontWeight: "700" }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Full Physical Street Address</label>
                      <input
                        type="text"
                        value={editForm.address || ""}
                        placeholder="e.g. Level 8, Platina, Bandra Kurla Complex, Bandra East"
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                        className="glass-input"
                        style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                      />
                    </div>
                  </div>

                  {/* Section 2: Corporate Contact */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "16px"
                  }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#fff", textTransform: "uppercase", marginBottom: "12px" }}>
                      🏢 Corporate Communications
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Corporate Email</label>
                        <input
                          type="email"
                          value={editForm.company_email || ""}
                          placeholder="contact@company.com"
                          onChange={e => setEditForm({ ...editForm, company_email: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Corporate Phone</label>
                        <input
                          type="text"
                          value={editForm.company_phone || ""}
                          placeholder="+91-22-6789-8000"
                          onChange={e => setEditForm({ ...editForm, company_phone: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "4px" }}>Website Domain</label>
                        <input
                          type="text"
                          value={editForm.domain || ""}
                          placeholder="company.com"
                          onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
                          className="glass-input"
                          style={{ width: "100%", padding: "7px 10px", fontSize: "0.78rem" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Executive Leadership Columns */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "16px"
                  }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#fff", textTransform: "uppercase", marginBottom: "12px" }}>
                      👥 Executive Leadership Columns (Founder, CEO, MD)
                    </div>

                    {/* Founder */}
                    <div style={{ padding: "10px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", marginBottom: "10px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--neon-cyan)", fontWeight: "700", marginBottom: "8px" }}>Founder / Co-Founder</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="Founder Name"
                          value={editForm.founder_name || ""}
                          onChange={e => setEditForm({ ...editForm, founder_name: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                        <input
                          type="email"
                          placeholder="Founder Email"
                          value={editForm.founder_email || ""}
                          onChange={e => setEditForm({ ...editForm, founder_email: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                        <input
                          type="text"
                          placeholder="Founder Phone"
                          value={editForm.founder_phone || ""}
                          onChange={e => setEditForm({ ...editForm, founder_phone: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                      </div>
                    </div>

                    {/* CEO */}
                    <div style={{ padding: "10px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", marginBottom: "10px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--neon-emerald)", fontWeight: "700", marginBottom: "8px" }}>Chief Executive Officer (CEO)</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="CEO Name"
                          value={editForm.ceo_name || ""}
                          onChange={e => setEditForm({ ...editForm, ceo_name: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                        <input
                          type="email"
                          placeholder="CEO Email"
                          value={editForm.ceo_email || ""}
                          onChange={e => setEditForm({ ...editForm, ceo_email: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                        <input
                          type="text"
                          placeholder="CEO Phone"
                          value={editForm.ceo_phone || ""}
                          onChange={e => setEditForm({ ...editForm, ceo_phone: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                      </div>
                    </div>

                    {/* MD */}
                    <div style={{ padding: "10px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--neon-amber)", fontWeight: "700", marginBottom: "8px" }}>Managing Director (MD)</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="MD Name"
                          value={editForm.md_name || ""}
                          onChange={e => setEditForm({ ...editForm, md_name: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                        <input
                          type="email"
                          placeholder="MD Email"
                          value={editForm.md_email || ""}
                          onChange={e => setEditForm({ ...editForm, md_email: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                        <input
                          type="text"
                          placeholder="MD Phone"
                          value={editForm.md_phone || ""}
                          onChange={e => setEditForm({ ...editForm, md_phone: e.target.value })}
                          className="glass-input"
                          style={{ padding: "6px 8px", fontSize: "0.74rem" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      style={{
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "var(--text-muted)",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.78rem"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      style={{
                        background: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
                        border: "none",
                        color: "#000",
                        padding: "8px 20px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "0.78rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Save size={14} className={savingProfile ? "spin" : ""} />
                      {savingProfile ? "Syncing..." : "Save & Sync to Neon"}
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW DOSSIER MODE */
                <>
                  {/* Verification & Authenticity Audit Card */}
                  <div style={{
                    background: verificationReport && verificationReport.trust_score >= 80
                      ? "rgba(16, 185, 129, 0.07)"
                      : verificationReport && verificationReport.trust_score >= 50
                      ? "rgba(245, 158, 11, 0.07)"
                      : "rgba(239, 68, 68, 0.07)",
                    border: `1px solid ${
                      verificationReport && verificationReport.trust_score >= 80
                        ? "rgba(16, 185, 129, 0.35)"
                        : verificationReport && verificationReport.trust_score >= 50
                        ? "rgba(245, 158, 11, 0.35)"
                        : "rgba(239, 68, 68, 0.35)"
                    }`,
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {/* Header: Score + Confidence Level */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "52px", height: "52px", borderRadius: "12px",
                          background: verificationReport && verificationReport.trust_score >= 80 ? "rgba(16, 185, 129, 0.2)" : verificationReport && verificationReport.trust_score >= 50 ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          border: `1px solid ${verificationReport && verificationReport.trust_score >= 80 ? "var(--neon-emerald)" : verificationReport && verificationReport.trust_score >= 50 ? "var(--neon-amber)" : "var(--neon-rose)"}`,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
                        }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: "900", color: "#fff", lineHeight: 1 }}>
                            {verificationReport ? verificationReport.trust_score : (selectedCompany.trust_score || 0)}%
                          </span>
                          <span style={{ fontSize: "0.55rem", textTransform: "uppercase", color: "var(--text-muted)", marginTop: "2px" }}>Trust</span>
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--neon-cyan)", fontWeight: "700", textTransform: "uppercase" }}>
                              🛡️ Ground-Truth Authenticity Audit
                            </span>
                            <span className="badge" style={{
                              background: verificationReport && verificationReport.trust_score >= 80 ? "rgba(16, 185, 129, 0.2)" : verificationReport && verificationReport.trust_score >= 50 ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                              color: verificationReport && verificationReport.trust_score >= 80 ? "var(--neon-emerald)" : verificationReport && verificationReport.trust_score >= 50 ? "var(--neon-amber)" : "var(--neon-rose)",
                              fontSize: "0.68rem", fontWeight: "700"
                            }}>
                              {verificationReport?.confidence_level || (selectedCompany.trust_score ? (selectedCompany.trust_score >= 80 ? "HIGH_CONFIDENCE" : selectedCompany.trust_score >= 50 ? "MODERATE_CONFIDENCE" : "LOW_CONFIDENCE") : "UNVERIFIED")}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-main)", marginTop: "4px", lineHeight: "1.3" }}>
                            {verificationReport?.summary || (selectedCompany.trust_score ? "Entity audit recorded." : "No audit executed yet. Click 'Verify Authenticity' to run live checks.")}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleVerifyCompany(selectedCompany, e)}
                        disabled={verifyingId === selectedCompany.id}
                        style={{
                          background: "rgba(6, 182, 212, 0.15)",
                          border: "1px solid var(--neon-cyan)",
                          color: "#fff",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.74rem",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <ShieldCheck size={14} className={verifyingId === selectedCompany.id ? "spin" : ""} />
                        {verifyingId === selectedCompany.id ? "Auditing Live..." : "Re-Run 5-Point Audit"}
                      </button>
                    </div>

                    {/* Registry Match Pill */}
                    {verificationReport?.registry_match && (
                      <div style={{
                        background: "rgba(6, 182, 212, 0.1)",
                        border: "1px solid rgba(6, 182, 212, 0.25)",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "0.72rem",
                        color: "var(--neon-cyan)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <Award size={14} />
                        <span>Regulatory Filing Match: <strong>{verificationReport.registry_match}</strong></span>
                      </div>
                    )}

                    {/* Itemized 5-Point Checks Checklist */}
                    {verificationReport?.checks && verificationReport.checks.length > 0 && (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "8px",
                        marginTop: "4px"
                      }}>
                        {verificationReport.checks.map((chk, idx) => {
                          const isPass = chk.status === "PASS";
                          const isWarn = chk.status === "WARN";
                          const statusBg = isPass ? "rgba(16, 185, 129, 0.12)" : isWarn ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)";
                          const statusColor = isPass ? "var(--neon-emerald)" : isWarn ? "var(--neon-amber)" : "var(--neon-rose)";
                          const statusBorder = isPass ? "rgba(16, 185, 129, 0.25)" : isWarn ? "rgba(245, 158, 11, 0.25)" : "rgba(239, 68, 68, 0.25)";

                          return (
                            <div key={idx} style={{
                              background: "rgba(0, 0, 0, 0.25)",
                              border: `1px solid ${statusBorder}`,
                              borderRadius: "8px",
                              padding: "9px 12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "#fff" }}>
                                  {chk.name}
                                </span>
                                <span style={{
                                  background: statusBg,
                                  color: statusColor,
                                  border: `1px solid ${statusBorder}`,
                                  borderRadius: "4px",
                                  padding: "2px 6px",
                                  fontSize: "0.65rem",
                                  fontWeight: "800"
                                }}>
                                  {chk.score_awarded} / {chk.max_score} pts • {chk.status}
                                </span>
                              </div>
                              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.3 }}>
                                {chk.detail}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Subscription Status Card */}
                  <div style={{
                    background: selectedCompany.is_subscribed ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                    border: `1px solid ${selectedCompany.is_subscribed ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: selectedCompany.is_subscribed ? "var(--neon-emerald)" : "var(--neon-amber)", fontWeight: "700", textTransform: "uppercase" }}>
                        Service Subscription Status
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", marginTop: "2px" }}>
                        {selectedCompany.is_subscribed ? "Subscribed Client" : "Unsubscribed Entity"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Tier: <strong style={{ color: "#fff" }}>{selectedCompany.subscription_tier}</strong>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleSubscription(selectedCompany, e)}
                      style={{
                        background: selectedCompany.is_subscribed ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        border: `1px solid ${selectedCompany.is_subscribed ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                        color: selectedCompany.is_subscribed ? "var(--neon-rose)" : "var(--neon-emerald)",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.76rem",
                        fontWeight: "600"
                      }}
                    >
                      {selectedCompany.is_subscribed ? "Cancel Subscription" : "Subscribe Company"}
                    </button>
                  </div>

                  {/* Geographical, Contact & Postal Address Dossier */}
                  <div style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    fontSize: "0.76rem"
                  }}>
                    <div>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>Country</span>
                      <div style={{ color: "#fff", fontWeight: "600", marginTop: "2px" }}>{selectedCompany.country || "GLOBAL"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>City & State</span>
                      <div style={{ color: "#fff", marginTop: "2px" }}>
                        {selectedCompany.city}
                        {selectedCompany.state && selectedCompany.state !== "N/A" ? `, ${selectedCompany.state}` : ""}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>Pincode / Postal Code</span>
                      <div style={{ color: "var(--neon-cyan)", fontWeight: "700", marginTop: "2px" }}>
                        {selectedCompany.pincode && selectedCompany.pincode !== "N/A" ? selectedCompany.pincode : "N/A"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>Company Email</span>
                      <div style={{ marginTop: "2px" }}>
                        {(selectedCompany.company_email || selectedCompany.primary_email) && (selectedCompany.company_email || selectedCompany.primary_email) !== "N/A" ? (
                          <a
                            href={`mailto:${selectedCompany.company_email || selectedCompany.primary_email}`}
                            style={{ color: "var(--neon-cyan)", textDecoration: "none", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px" }}
                          >
                            <Mail size={12} /> {selectedCompany.company_email || selectedCompany.primary_email}
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-dim)" }}>N/A</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>Company Phone</span>
                      <div style={{ marginTop: "2px", display: "flex", alignItems: "center", gap: "5px", color: "var(--text-main)" }}>
                        <Phone size={12} style={{ color: "var(--text-muted)" }} />
                        {(selectedCompany.company_phone || selectedCompany.phone) && (selectedCompany.company_phone || selectedCompany.phone) !== "N/A"
                          ? (selectedCompany.company_phone || selectedCompany.phone)
                          : <span style={{ color: "var(--text-dim)" }}>N/A</span>}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>Domain / Website</span>
                      <div style={{ marginTop: "2px", display: "flex", alignItems: "center", gap: "5px", color: "var(--neon-emerald)" }}>
                        <Globe size={12} />
                        {selectedCompany.domain && selectedCompany.domain !== "N/A"
                          ? selectedCompany.domain
                          : <span style={{ color: "var(--text-dim)" }}>N/A</span>}
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: "700" }}>Physical Address</span>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px", lineHeight: "1.4" }}>
                        {selectedCompany.address && selectedCompany.address !== "N/A" ? selectedCompany.address : (selectedCompany.physical_address || "N/A")}
                      </div>
                    </div>
                  </div>

                  {/* Direct Leadership Columns Display */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: "10px"
                  }}>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", padding: "10px 12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ fontSize: "0.66rem", color: "var(--neon-cyan)", fontWeight: "700", textTransform: "uppercase" }}>Founder / Co-Founder</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#fff", marginTop: "3px" }}>{selectedCompany.founder_name || "N/A"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>{selectedCompany.founder_email || "N/A"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{selectedCompany.founder_phone || "N/A"}</div>
                    </div>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", padding: "10px 12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ fontSize: "0.66rem", color: "var(--neon-emerald)", fontWeight: "700", textTransform: "uppercase" }}>Chief Executive Officer (CEO)</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#fff", marginTop: "3px" }}>{selectedCompany.ceo_name || "N/A"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>{selectedCompany.ceo_email || "N/A"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{selectedCompany.ceo_phone || "N/A"}</div>
                    </div>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: "8px", padding: "10px 12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <div style={{ fontSize: "0.66rem", color: "var(--neon-amber)", fontWeight: "700", textTransform: "uppercase" }}>Managing Director (MD)</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#fff", marginTop: "3px" }}>{selectedCompany.md_name || "N/A"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "3px" }}>{selectedCompany.md_email || "N/A"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{selectedCompany.md_phone || "N/A"}</div>
                    </div>
                  </div>

                  {/* Notice if data is incomplete */}
                  {(!selectedCompany.pincode || selectedCompany.pincode === "N/A" || !selectedCompany.executives || selectedCompany.executives.length === 0) && (
                    <div style={{
                      background: "rgba(6, 182, 212, 0.05)",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        💡 Initial scan had limited postal or officer information. Click <strong>Edit / Enrich Dossier</strong> to add verified street address, pincode, state, or executive contacts.
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        style={{
                          background: "rgba(6, 182, 212, 0.15)",
                          border: "1px solid var(--neon-cyan)",
                          color: "var(--neon-cyan)",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        Enrich Now
                      </button>
                    </div>
                  )}

                  {/* Verified Officers & Leadership Table */}
                  <div>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "10px", textTransform: "uppercase" }}>
                      Verified Leadership & Officers ({selectedCompany.executives?.length || 0})
                    </h4>

                    {(!selectedCompany.executives || selectedCompany.executives.length === 0) ? (
                      <div style={{ padding: "16px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "8px", textAlign: "center", color: "var(--text-dim)", fontSize: "0.76rem" }}>
                        No individual executive profiles registered for this entity. Click "Edit / Enrich Dossier" to add them.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedCompany.executives.map((ex, i) => (
                          <div
                            key={ex.id || i}
                            style={{
                              background: "rgba(0, 0, 0, 0.25)",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px"
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ color: "#fff", fontSize: "0.82rem" }}>{ex.name}</strong>
                                <span className="badge" style={{
                                  background: ex.role_type === "FOUNDER" ? "rgba(6, 182, 212, 0.15)" : (ex.role_type === "CEO" ? "rgba(16, 185, 129, 0.15)" : (ex.role_type === "MD" ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)")),
                                  color: ex.role_type === "FOUNDER" ? "var(--neon-cyan)" : (ex.role_type === "CEO" ? "var(--neon-emerald)" : (ex.role_type === "MD" ? "var(--neon-amber)" : "var(--text-muted)")),
                                  fontSize: "0.64rem"
                                }}>
                                  {ex.role_type}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                {ex.title}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.72rem" }}>
                              {ex.email && ex.email !== "N/A" && (
                                <span style={{ color: "var(--neon-cyan)", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Mail size={12} /> {ex.email}
                                </span>
                              )}
                              {ex.phone && ex.phone !== "N/A" && (
                                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                                  <Phone size={12} /> {ex.phone}
                                </span>
                              )}
                              {ex.linkedin_url && ex.linkedin_url !== "N/A" && (
                                <a
                                  href={ex.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "var(--neon-blue)", display: "flex", alignItems: "center", gap: "3px" }}
                                >
                                  <ExternalLink size={12} /> Profile
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
