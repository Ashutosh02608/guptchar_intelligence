import React, { useState, useMemo, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink, 
  Search, 
  Filter, 
  Download, 
  ChevronRight,
  TrendingUp,
  Sparkles,
  Timer
} from "lucide-react";
import { calculateDeadlineInfo, getRadarSummary } from "../utils/deadlineTracker";

export function ComplianceCalendarPage({ updates = [], onSelectUpdate }) {
  const [jurisdictionFilter, setJurisdictionFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Periodically update current time to keep countdown tickers fresh
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const radarStats = useMemo(() => getRadarSummary(updates), [updates, currentTime]);

  // Enrich each update with calculated deadline information and sort chronologically
  const enrichedUpdates = useMemo(() => {
    return updates
      .map(item => ({
        ...item,
        deadlineInfo: calculateDeadlineInfo(item, currentTime)
      }))
      .filter(item => item.deadlineInfo !== null)
      .sort((a, b) => a.deadlineInfo.deadlineMs - b.deadlineInfo.deadlineMs);
  }, [updates, currentTime]);

  // Filter items
  const filteredItems = useMemo(() => {
    return enrichedUpdates.filter(item => {
      if (jurisdictionFilter !== "ALL" && item.jurisdiction !== jurisdictionFilter) return false;
      if (urgencyFilter !== "ALL") {
        if (urgencyFilter === "IMMEDIATE" && item.deadlineInfo.urgencyTier !== "IMMEDIATE" && !item.deadlineInfo.isOverdue) return false;
        if (urgencyFilter === "APPROACHING" && item.deadlineInfo.urgencyTier !== "APPROACHING") return false;
        if (urgencyFilter === "SCHEDULED" && item.deadlineInfo.urgencyTier !== "SCHEDULED") return false;
        if (urgencyFilter === "OVERDUE" && !item.deadlineInfo.isOverdue) return false;
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
  }, [enrichedUpdates, jurisdictionFilter, urgencyFilter, searchQuery]);

  const handleExportCSV = () => {
    const headers = ["Title", "Authority", "Jurisdiction", "Severity", "Deadline Date", "Countdown", "Urgency Tier", "URL"];
    const rows = filteredItems.map(item => [
      `"${(item.title || "").replace(/"/g, '""')}"`,
      `"${item.board_name || ""}"`,
      item.jurisdiction || "",
      item.severity || "",
      `"${item.deadlineInfo?.formattedDeadline || ""}"`,
      `"${item.deadlineInfo?.countdownText || ""}"`,
      item.deadlineInfo?.urgencyTier || "",
      `"${item.url || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `guptchar_compliance_calendar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getJurisdictionFlag = (code) => {
    switch (code) {
      case "IN": return "🇮🇳";
      case "US": return "🇺🇸";
      case "UK": return "🇬🇧";
      case "EU": return "🇪🇺";
      default: return "🌐";
    }
  };

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "22px 24px", marginBottom: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CalendarIcon size={24} color="var(--neon-emerald)" />
              <h1 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#ffffff", margin: 0, letterSpacing: "0.02em" }}>
                STATUTORY COMPLIANCE CALENDAR & DEADLINE RADAR
              </h1>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: "6px", marginBottom: 0 }}>
              Autonomous statutory enforcement timelines, grace periods, and reporting milestones extracted from official circulars
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "0.82rem" }}
            title="Export statutory timeline as CSV"
          >
            <Download size={14} />
            <span>Export Calendar (.CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", 
        gap: "14px", 
        marginBottom: "22px" 
      }}>
        <div 
          className="glass-panel" 
          onClick={() => setUrgencyFilter(urgencyFilter === "IMMEDIATE" ? "ALL" : "IMMEDIATE")}
          style={{ 
            padding: "16px", 
            cursor: "pointer", 
            border: urgencyFilter === "IMMEDIATE" ? "1px solid var(--neon-rose)" : "1px solid rgba(244, 63, 94, 0.2)",
            background: "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--neon-rose)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Critical Immediate (&lt;7d)
            </span>
            <AlertTriangle size={16} color="var(--neon-rose)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", marginTop: "8px" }}>
            {radarStats.immediateCount}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Emergency compliance window active
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setUrgencyFilter(urgencyFilter === "APPROACHING" ? "ALL" : "APPROACHING")}
          style={{ 
            padding: "16px", 
            cursor: "pointer", 
            border: urgencyFilter === "APPROACHING" ? "1px solid var(--neon-amber)" : "1px solid rgba(245, 158, 11, 0.2)",
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--neon-amber)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Approaching Windows (7-30d)
            </span>
            <Clock size={16} color="var(--neon-amber)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", marginTop: "8px" }}>
            {radarStats.approachingCount}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Action plan preparation window
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setUrgencyFilter(urgencyFilter === "SCHEDULED" ? "ALL" : "SCHEDULED")}
          style={{ 
            padding: "16px", 
            cursor: "pointer", 
            border: urgencyFilter === "SCHEDULED" ? "1px solid var(--neon-cyan)" : "1px solid rgba(6, 182, 212, 0.2)",
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--neon-cyan)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Scheduled Windows (&gt;30d)
            </span>
            <CheckCircle2 size={16} color="var(--neon-cyan)" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", marginTop: "8px" }}>
            {radarStats.scheduledCount}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Standard statutory transition
          </div>
        </div>

        <div 
          className="glass-panel" 
          onClick={() => setUrgencyFilter("ALL")}
          style={{ 
            padding: "16px", 
            cursor: "pointer", 
            border: urgencyFilter === "ALL" ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.7)",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Monitored Directives
            </span>
            <Timer size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", marginTop: "8px" }}>
            {enrichedUpdates.length}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Active global radar sweeps
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: "16px", marginBottom: "22px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search bar */}
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search circular title, authority, or compliance mandate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius-sm)",
                color: "#ffffff",
                fontSize: "0.82rem",
                outline: "none"
              }}
            />
          </div>

          {/* Jurisdiction Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "4px" }}>Jurisdiction:</span>
            {["ALL", "IN", "US", "UK", "EU"].map(code => (
              <button
                key={code}
                onClick={() => setJurisdictionFilter(code)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.74rem",
                  fontWeight: "600",
                  borderRadius: "4px",
                  border: jurisdictionFilter === code ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.1)",
                  background: jurisdictionFilter === code ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: jurisdictionFilter === code ? "#ffffff" : "var(--text-muted)",
                  cursor: "pointer"
                }}
              >
                {code === "ALL" ? "🌐 Global" : `${getJurisdictionFlag(code)} ${code}`}
              </button>
            ))}
          </div>

          {/* Urgency Filter Clear Badge */}
          {urgencyFilter !== "ALL" && (
            <button
              onClick={() => setUrgencyFilter("ALL")}
              style={{
                background: "rgba(244, 63, 94, 0.2)",
                border: "1px solid var(--neon-rose)",
                color: "#ffffff",
                borderRadius: "4px",
                padding: "4px 10px",
                fontSize: "0.74rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Filter: {urgencyFilter} ✕
            </button>
          )}
        </div>
      </div>

      {/* Chronological Calendar Timeline Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Timer size={40} color="var(--neon-cyan)" style={{ opacity: 0.5, margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", margin: "0 0 6px" }}>
            No Regulatory Deadlines Matching Filter
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
            Adjust your search query or reset the jurisdiction/urgency filters to inspect all monitored directives.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredItems.map((item, idx) => {
            const dInfo = item.deadlineInfo;
            const isImmediate = dInfo.urgencyTier === "IMMEDIATE" || dInfo.isOverdue;
            const isApproaching = dInfo.urgencyTier === "APPROACHING";

            return (
              <div 
                key={item.id || idx}
                className="glass-panel"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  borderLeft: isImmediate 
                    ? "4px solid var(--neon-rose)" 
                    : isApproaching 
                    ? "4px solid var(--neon-amber)" 
                    : "4px solid var(--neon-cyan)",
                  background: isImmediate
                    ? "linear-gradient(90deg, rgba(244, 63, 94, 0.05) 0%, rgba(15, 23, 42, 0.6) 100%)"
                    : "rgba(15, 23, 42, 0.6)",
                  transition: "transform 0.15s ease, border-color 0.15s ease"
                }}
              >
                {/* Left: Deadline Calendar Badge + Main Details */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flex: "1 1 500px" }}>
                  {/* Calendar Date Badge */}
                  <div style={{
                    minWidth: "75px",
                    padding: "8px 6px",
                    textAlign: "center",
                    borderRadius: "6px",
                    background: isImmediate 
                      ? "rgba(244, 63, 94, 0.15)" 
                      : isApproaching 
                      ? "rgba(245, 158, 11, 0.15)" 
                      : "rgba(6, 182, 212, 0.15)",
                    border: isImmediate 
                      ? "1px solid rgba(244, 63, 94, 0.3)" 
                      : isApproaching 
                      ? "1px solid rgba(245, 158, 11, 0.3)" 
                      : "1px solid rgba(6, 182, 212, 0.3)"
                  }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      DEADLINE
                    </div>
                    <div style={{ 
                      fontSize: "0.85rem", 
                      fontWeight: "800", 
                      color: isImmediate ? "var(--neon-rose)" : isApproaching ? "var(--neon-amber)" : "var(--neon-cyan)",
                      marginTop: "2px"
                    }}>
                      {dInfo.formattedDeadline?.slice(0, 6) || "TBD"}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "1px" }}>
                      {dInfo.formattedDeadline?.slice(7) || ""}
                    </div>
                  </div>

                  {/* Directive Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                      <span className="badge badge-outline" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                        {getJurisdictionFlag(item.jurisdiction)} {item.board_name}
                      </span>
                      <span className={`badge ${
                        item.severity === "CRITICAL" ? "badge-critical" : item.severity === "HIGH" ? "badge-high" : "badge-medium"
                      }`} style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                        {item.severity}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        Issued: {new Date(item.detected_at * 1000).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 
                      onClick={() => onSelectUpdate && onSelectUpdate(item)}
                      style={{ 
                        fontSize: "0.95rem", 
                        fontWeight: "700", 
                        color: "#ffffff", 
                        margin: "0 0 6px", 
                        cursor: "pointer",
                        lineHeight: 1.4
                      }}
                      onMouseEnter={(e) => e.target.style.color = "var(--neon-cyan)"}
                      onMouseLeave={(e) => e.target.style.color = "#ffffff"}
                    >
                      {item.title}
                    </h3>

                    {item.summary && (
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45, maxWidth: "720px" }}>
                        {item.summary.length > 150 ? `${item.summary.slice(0, 150)}...` : item.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Countdown Timer & Action Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  {/* Live Countdown Badge */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      background: isImmediate 
                        ? "rgba(244, 63, 94, 0.2)" 
                        : isApproaching 
                        ? "rgba(245, 158, 11, 0.2)" 
                        : "rgba(6, 182, 212, 0.15)",
                      border: isImmediate 
                        ? "1px solid var(--neon-rose)" 
                        : isApproaching 
                        ? "1px solid var(--neon-amber)" 
                        : "1px solid var(--neon-cyan)"
                    }}>
                      <Clock size={13} color={isImmediate ? "var(--neon-rose)" : isApproaching ? "var(--neon-amber)" : "var(--neon-cyan)"} />
                      <span style={{ 
                        fontSize: "0.82rem", 
                        fontWeight: "800", 
                        color: isImmediate ? "#ffffff" : isApproaching ? "#ffffff" : "#ffffff",
                        letterSpacing: "0.02em"
                      }}>
                        {dInfo.countdownText}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "4px" }}>
                      Enforcement: {dInfo.urgencyTier}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {onSelectUpdate && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => onSelectUpdate(item)}
                        style={{ padding: "6px 12px", fontSize: "0.76rem" }}
                        title="View comprehensive regulatory analysis and impacted sectors"
                      >
                        <span>Audit Impact</span>
                        <ChevronRight size={13} />
                      </button>
                    )}

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "6px 10px", fontSize: "0.76rem" }}
                        title="View official statutory release on regulatory portal"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
