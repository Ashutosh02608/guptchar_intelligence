import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  ExternalLink, 
  CheckCheck, 
  ShieldAlert, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  Share2,
  Bookmark,
  ArrowRight,
  Activity,
  Timer,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { calculateDeadlineInfo, getRadarSummary } from "../utils/deadlineTracker";

export function UpdatesFeed({ 
  updates, 
  onSelectUpdate, 
  onMarkAllRead, 
  onMarkRead, 
  onResetFeed,
  onNavigateToFullView,
  isEmbedded = false
}) {
  const [jurisdictionFilter, setJurisdictionFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [deadlineFilter, setDeadlineFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Periodically update current time to keep countdown tickers fresh
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 20000);
    return () => clearInterval(timer);
  }, []);

  const radarStats = useMemo(() => getRadarSummary(updates), [updates, currentTime]);

  const getJurisdictionFlag = (code) => {
    switch (code) {
      case "IN": return "🇮🇳";
      case "US": return "🇺🇸";
      case "UK": return "🇬🇧";
      case "EU": return "🇪🇺";
      default: return "🌐";
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL": return "badge-critical";
      case "HIGH": return "badge-high";
      case "MEDIUM": return "badge-medium";
      default: return "badge-info";
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Recently";
    const diff = Math.floor(Date.now() / 1000 - timestamp);
    if (diff < 15) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const handleCopyLink = (e, item) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter items
  const filteredUpdates = updates.filter((item) => {
    if (jurisdictionFilter !== "ALL" && item.jurisdiction !== jurisdictionFilter) return false;
    if (severityFilter !== "ALL" && item.severity !== severityFilter) return false;
    if (deadlineFilter !== "ALL") {
      const dInfo = calculateDeadlineInfo(item, currentTime);
      if (deadlineFilter === "IMMEDIATE") {
        if (dInfo.urgencyTier !== "IMMEDIATE" && !dInfo.isOverdue) return false;
      } else if (deadlineFilter === "APPROACHING") {
        if (dInfo.urgencyTier !== "APPROACHING") return false;
      } else if (deadlineFilter === "SCHEDULED") {
        if (dInfo.urgencyTier !== "SCHEDULED") return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchSummary = item.summary?.toLowerCase().includes(q);
      const matchBoard = item.board_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchBoard) return false;
    }
    return true;
  });

  return (
    <div className={`glass-panel ${isEmbedded ? "updates-feed-embedded" : ""}`} style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header and Quick Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={17} color="var(--neon-cyan)" />
              <span>LIVE REGULATORY STREAM</span>
            </h2>
            <span className="badge badge-medium">
              {filteredUpdates.length} Records
            </span>
            {deadlineFilter !== "ALL" && (
              <span 
                className="badge badge-critical" 
                style={{ fontSize: "0.68rem", cursor: "pointer" }}
                onClick={() => setDeadlineFilter("ALL")}
                title="Click to clear deadline filter"
              >
                Radar Filter: {deadlineFilter} ✕
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
            Real-time feed indexed by Guptchar 10-second sweep surveillance
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button 
            id="btn-reset-feed"
            className="btn btn-secondary" 
            style={{ fontSize: "0.78rem", padding: "6px 12px" }}
            onClick={onResetFeed}
            title="Wipe previous items and establish fresh baseline watermark"
          >
            <SlidersHorizontal size={13} />
            <span>Reset Watermark</span>
          </button>
          
          <button 
            id="btn-mark-all-read"
            className="btn btn-secondary" 
            style={{ fontSize: "0.78rem", padding: "6px 12px" }}
            onClick={onMarkAllRead}
          >
            <CheckCheck size={14} color="var(--neon-emerald)" />
            <span>Mark All Read</span>
          </button>

          {onNavigateToFullView && (
            <button 
              id="btn-feed-full-view"
              className="btn btn-secondary" 
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={onNavigateToFullView}
              title="Open full updates stream"
            >
              <span>Full View</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "12px", 
        background: "rgba(0, 0, 0, 0.25)", 
        padding: "12px 14px", 
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        marginBottom: "18px"
      }}>
        {/* Search input */}
        <div style={{ position: "relative" }}>
          <Search size={16} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            id="input-search-circulars"
            type="text"
            placeholder="Search newly detected circulars, notifications, orders, or rule amendments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 38px",
              background: "rgba(11, 17, 30, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--radius-sm)",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontFamily: "var(--font-body)",
              outline: "none"
            }}
          />
        </div>

        {/* Regulatory Deadline Radar Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "8px 12px",
          background: "linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid rgba(6, 182, 212, 0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Timer size={14} color="var(--neon-cyan)" />
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#e2e8f0", letterSpacing: "0.04em" }}>
              COMPLIANCE DEADLINE RADAR:
            </span>
          </div>

          <div className="scroll-touch-x" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <button
              id="filter-deadline-all"
              onClick={() => setDeadlineFilter("ALL")}
              style={{
                padding: "3px 8px",
                fontSize: "0.71rem",
                fontWeight: "600",
                borderRadius: "4px",
                border: deadlineFilter === "ALL" ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                background: deadlineFilter === "ALL" ? "rgba(6, 182, 212, 0.25)" : "rgba(255, 255, 255, 0.03)",
                color: deadlineFilter === "ALL" ? "var(--neon-cyan)" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              All Deadlines ({radarStats.total})
            </button>

            <button
              id="filter-deadline-immediate"
              onClick={() => setDeadlineFilter(deadlineFilter === "IMMEDIATE" ? "ALL" : "IMMEDIATE")}
              style={{
                padding: "3px 8px",
                fontSize: "0.71rem",
                fontWeight: "600",
                borderRadius: "4px",
                border: deadlineFilter === "IMMEDIATE" ? "1px solid #ef4444" : "1px solid rgba(239, 68, 68, 0.25)",
                background: deadlineFilter === "IMMEDIATE" ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.06)",
                color: "#f87171",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease"
              }}
              title="Prioritize circulars with compliance deadlines under 7 days"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
              <span>🔴 Urgent &lt;7d ({radarStats.immediate})</span>
            </button>

            <button
              id="filter-deadline-approaching"
              onClick={() => setDeadlineFilter(deadlineFilter === "APPROACHING" ? "ALL" : "APPROACHING")}
              style={{
                padding: "3px 8px",
                fontSize: "0.71rem",
                fontWeight: "600",
                borderRadius: "4px",
                border: deadlineFilter === "APPROACHING" ? "1px solid #f59e0b" : "1px solid rgba(245, 158, 11, 0.25)",
                background: deadlineFilter === "APPROACHING" ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.06)",
                color: "#fbbf24",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease"
              }}
              title="Prioritize circulars with compliance deadlines within 30 days"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} />
              <span>🟡 Approaching &lt;30d ({radarStats.approaching})</span>
            </button>

            <button
              id="filter-deadline-scheduled"
              onClick={() => setDeadlineFilter(deadlineFilter === "SCHEDULED" ? "ALL" : "SCHEDULED")}
              style={{
                padding: "3px 8px",
                fontSize: "0.71rem",
                fontWeight: "600",
                borderRadius: "4px",
                border: deadlineFilter === "SCHEDULED" ? "1px solid #10b981" : "1px solid rgba(16, 185, 129, 0.25)",
                background: deadlineFilter === "SCHEDULED" ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.06)",
                color: "#34d399",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease"
              }}
              title="Circulars with statutory horizon deadlines (30 days or more)"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              <span>🟢 Scheduled 30d+ ({radarStats.scheduled})</span>
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          {/* Jurisdiction Filters */}
          <div className="scroll-touch-x" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginRight: "4px", whiteSpace: "nowrap" }}>JURISDICTION:</span>
            {[
              { id: "ALL", label: "ALL" },
              { id: "IN", label: "🇮🇳 INDIA" },
              { id: "US", label: "🇺🇸 US" },
              { id: "UK", label: "🇬🇧 UK" },
              { id: "EU", label: "🇪🇺 EU" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setJurisdictionFilter(f.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  borderRadius: "var(--radius-full)",
                  border: jurisdictionFilter === f.id ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: jurisdictionFilter === f.id ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: jurisdictionFilter === f.id ? "var(--neon-cyan)" : "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Severity Filters */}
          <div className="scroll-touch-x" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginRight: "4px", whiteSpace: "nowrap" }}>SEVERITY:</span>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "INFO"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  fontWeight: "600",
                  borderRadius: "var(--radius-full)",
                  border: severityFilter === s ? "1px solid var(--neon-emerald)" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: severityFilter === s ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: severityFilter === s ? "var(--neon-emerald)" : "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease"
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List of Circular Cards */}
      <div 
        className={`sidebar-scroll-area ${isEmbedded ? "command-center-scroll-body" : ""}`}
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "10px", 
          flex: 1,
          overflowY: isEmbedded ? "auto" : "visible",
          paddingRight: isEmbedded ? "4px" : 0
        }}
      >
        {filteredUpdates.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "48px 24px", 
            background: "rgba(0, 0, 0, 0.2)", 
            borderRadius: "var(--radius-md)",
            border: "1px dashed rgba(16, 185, 129, 0.25)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <div style={{ 
              width: "48px", 
              height: "48px", 
              margin: "0 auto 14px", 
              borderRadius: "50%", 
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShieldAlert size={24} color="var(--neon-emerald)" className="animate-pulse-slow" />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
              24*7 SURVEILLANCE ACTIVE • ONLY LATEST RELEASES MONITORED
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "560px", margin: "0 auto 16px", lineHeight: 1.5 }}>
              Previous releases have been watermarked as baseline. The surveillance engine is polling SEBI, RBI, US SEC, UK FCA, and ESMA every 10 seconds. Only brand new announcements published from this moment onward will appear here and trigger urgent audio/visual alerts.
            </p>
          </div>
        ) : (
          filteredUpdates.map((item) => {
            const isCritical = item.severity === "CRITICAL";
            const isHigh = item.severity === "HIGH";
            const deadlineInfo = calculateDeadlineInfo(item, currentTime);
            const isUrgentDeadline = deadlineInfo?.urgencyTier === "IMMEDIATE" || deadlineInfo?.isOverdue;

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectUpdate(item);
                  if (!item.is_read) onMarkRead(item.id);
                }}
                style={{
                  background: item.is_read ? "rgba(14, 21, 37, 0.5)" : "rgba(17, 26, 46, 0.9)",
                  border: isUrgentDeadline
                    ? "1px solid rgba(239, 68, 68, 0.55)"
                    : isCritical 
                    ? "1px solid rgba(239, 68, 68, 0.45)" 
                    : isHigh 
                    ? "1px solid rgba(245, 158, 11, 0.35)" 
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 18px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isUrgentDeadline 
                    ? "0 0 16px rgba(239, 68, 68, 0.16)" 
                    : isCritical 
                    ? "0 0 15px rgba(239, 68, 68, 0.12)" 
                    : "none",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--neon-cyan)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isUrgentDeadline
                    ? "rgba(239, 68, 68, 0.55)"
                    : isCritical 
                    ? "rgba(239, 68, 68, 0.45)" 
                    : isHigh 
                    ? "rgba(245, 158, 11, 0.35)" 
                    : "1px solid rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {/* Top metadata line */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {/* Severity chip */}
                    <span className={`badge ${getSeverityBadgeClass(item.severity)}`}>
                      {item.severity}
                    </span>

                    {/* Authority badge */}
                    <span className="mono" style={{ fontSize: "0.78rem", fontWeight: "700", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>{getJurisdictionFlag(item.jurisdiction)}</span>
                      <span>{item.board_name}</span>
                    </span>

                    {/* Category tag */}
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                      {item.category}
                    </span>

                    {/* Live Compliance Deadline Countdown Ticker */}
                    {deadlineInfo && (
                      <span 
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "0.71rem",
                          fontWeight: "700",
                          background: isUrgentDeadline
                            ? "rgba(239, 68, 68, 0.2)"
                            : deadlineInfo.urgencyTier === "APPROACHING"
                            ? "rgba(245, 158, 11, 0.16)"
                            : "rgba(16, 185, 129, 0.12)",
                          border: `1px solid ${deadlineInfo.tierColor}66`,
                          color: deadlineInfo.tierColor,
                          letterSpacing: "0.02em"
                        }}
                        title={`Enforcement Deadline: ${deadlineInfo.formattedDate} (${deadlineInfo.stageTitle})`}
                      >
                        <Timer size={11} style={{ flexShrink: 0 }} />
                        <span>{deadlineInfo.compactBadge}</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} />
                      {formatRelativeTime(item.detected_at)}
                    </span>
                    {!item.is_read && (
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--neon-cyan)" }} />
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 style={{ 
                  fontSize: "0.96rem", 
                  fontWeight: "600", 
                  color: item.is_read ? "#94a3b8" : "#ffffff", 
                  lineHeight: 1.4, 
                  marginBottom: "6px" 
                }}>
                  {item.title}
                </h3>

                {/* Summary excerpt */}
                {item.summary && (
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.45, marginBottom: "10px" }}>
                    {item.summary}
                  </p>
                )}

                {/* Footer with actions and Target Deadline */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      {item.published_date ? `Published: ${item.published_date}` : "Official Listing"}
                    </span>
                    {deadlineInfo && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        <Calendar size={11} color="var(--neon-cyan)" />
                        <span>Deadline: <strong style={{ color: "#cbd5e1" }}>{deadlineInfo.formattedDate}</strong></span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      className="btn btn-secondary btn-icon"
                      style={{ width: "26px", height: "26px" }}
                      onClick={(e) => handleCopyLink(e, item)}
                      title="Copy URL"
                    >
                      <Share2 size={12} color={copiedId === item.id ? "var(--neon-emerald)" : undefined} />
                    </button>

                    <a

                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-icon"
                      style={{ width: "26px", height: "26px" }}
                      onClick={(e) => e.stopPropagation()}
                      title="Open Official Regulatory Document"
                    >
                      <ExternalLink size={12} />
                    </a>

                    <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: "0.74rem", color: "var(--neon-cyan)", fontWeight: "600" }}>
                      <span>Details</span>
                      <ChevronRight size={13} />
                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
