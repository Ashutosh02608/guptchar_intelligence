import React, { useState } from "react";
import { 
  Search, 
  ExternalLink, 
  CheckCheck, 
  ShieldAlert, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  Share2,
  Bookmark
} from "lucide-react";

export function UpdatesFeed({ updates, onSelectUpdate, onMarkAllRead, onMarkRead, onResetFeed }) {


  const [jurisdictionFilter, setJurisdictionFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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
    <div className="glass-panel" style={{ padding: "20px" }}>
      {/* Header and Quick Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
              LIVE REGULATORY STREAM & CIRCULARS
            </h2>
            <span className="badge badge-medium">
              {filteredUpdates.length} Records
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
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

        {/* Filter buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          {/* Jurisdiction Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginRight: "4px" }}>JURISDICTION:</span>
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
                  transition: "all 0.15s ease"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Severity Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginRight: "4px" }}>SEVERITY:</span>
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
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredUpdates.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "48px 24px", 
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed rgba(16, 185, 129, 0.25)"
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

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectUpdate(item);
                  if (!item.is_read) onMarkRead(item.id);
                }}
                style={{
                  background: item.is_read ? "rgba(14, 21, 37, 0.5)" : "rgba(17, 26, 46, 0.9)",
                  border: isCritical 
                    ? "1px solid rgba(239, 68, 68, 0.45)" 
                    : isHigh 
                    ? "1px solid rgba(245, 158, 11, 0.35)" 
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 18px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isCritical ? "0 0 15px rgba(239, 68, 68, 0.12)" : "none",
                  position: "relative"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--neon-cyan)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isCritical 
                    ? "rgba(239, 68, 68, 0.45)" 
                    : isHigh 
                    ? "rgba(245, 158, 11, 0.35)" 
                    : "1px solid rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {/* Top metadata line */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

                {/* Footer with actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                    {item.published_date ? `Published: ${item.published_date}` : "Official Listing"}
                  </span>

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
