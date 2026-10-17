import React, { useState } from "react";
import { 
  Layers, 
  PlusCircle, 
  ExternalLink, 
  Power, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Globe,
  Radio
} from "lucide-react";

export function BoardsPage({ boards, onToggleBoard, onOpenAddBoard, onDeleteBoard }) {
  const [search, setSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("ALL");

  const getJurisdictionBadge = (code) => {
    switch (code) {
      case "IN": return { flag: "🇮🇳", label: "INDIA" };
      case "US": return { flag: "🇺🇸", label: "UNITED STATES" };
      case "UK": return { flag: "🇬🇧", label: "UNITED KINGDOM" };
      case "EU": return { flag: "🇪🇺", label: "EUROPEAN UNION" };
      default: return { flag: "🌐", label: code };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "HEALTHY":
        return <span className="badge badge-healthy"><CheckCircle2 size={12} /> ONLINE</span>;
      case "DEGRADED":
        return <span className="badge badge-degraded"><AlertCircle size={12} /> DEGRADED</span>;
      case "ERROR":
        return <span className="badge badge-error"><XCircle size={12} /> ERROR</span>;
      default:
        return <span className="badge badge-info">CONNECTING</span>;
    }
  };

  const filtered = boards.filter((b) => {
    if (jurisdictionFilter !== "ALL" && b.jurisdiction !== jurisdictionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.short_code.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
    }
    return true;
  });

  const coreBoardIds = ["sebi", "rbi", "sec", "fca", "esma"];

  return (
    <div>
      {/* Header with Title and Add Board action */}
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Layers size={22} color="var(--neon-emerald)" />
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                REGULATORY BOARDS WATCHLIST
              </h2>
              <span className="badge badge-healthy">
                {boards.filter(b => b.enabled).length} / {boards.length} ACTIVE
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
              Autonomous 10-second polling cadence across all financial & securities regulators
            </p>
          </div>

          <button 
            id="btn-boards-add"
            className="btn btn-primary" 
            onClick={onOpenAddBoard}
          >
            <PlusCircle size={15} />
            <span>Add Regulatory Board</span>
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1", minWidth: "240px" }}>
            <Search size={15} color="var(--text-dim)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text"
              placeholder="Search by authority name, short code, or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          <div style={{ display: "flex", gap: "6px" }}>
            {["ALL", "IN", "US", "UK", "EU"].map((jur) => (
              <button
                key={jur}
                onClick={() => setJurisdictionFilter(jur)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  borderRadius: "var(--radius-full)",
                  border: jurisdictionFilter === jur ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: jurisdictionFilter === jur ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: jurisdictionFilter === jur ? "var(--neon-cyan)" : "var(--text-muted)",
                  cursor: "pointer"
                }}
              >
                {jur === "ALL" ? "ALL" : jur}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", 
        gap: "16px" 
      }}>
        {filtered.map((b) => {
          const jur = getJurisdictionBadge(b.jurisdiction);
          const isEnabled = b.enabled;
          const isCustom = !coreBoardIds.includes(b.id);
          const latency = b.last_latency_ms || 0;
          const latencyPct = Math.min(100, Math.max(5, (latency / 1200) * 100));

          return (
            <div 
              key={b.id} 
              className="glass-panel"
              style={{ 
                padding: "20px", 
                opacity: isEnabled ? 1 : 0.65,
                border: isEnabled ? undefined : "1px dashed rgba(255, 255, 255, 0.12)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px"
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.3rem" }}>{jur.flag}</span>
                    <span className="mono" style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
                      {b.short_code}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: "600" }}>
                      {jur.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Toggle */}
                    <button
                      className="btn btn-secondary btn-icon"
                      style={{ 
                        width: "30px", 
                        height: "30px", 
                        color: isEnabled ? "var(--neon-emerald)" : "var(--text-dim)" 
                      }}
                      onClick={() => onToggleBoard(b.id, !isEnabled)}
                      title={isEnabled ? "Pause 10s Surveillance" : "Resume Surveillance"}
                    >
                      <Power size={14} />
                    </button>

                    {/* External Link */}
                    <a
                      href={b.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-icon"
                      style={{ width: "30px", height: "30px" }}
                      title="Visit Official Regulatory Website"
                    >
                      <ExternalLink size={14} />
                    </a>

                    {/* Delete (if custom) */}
                    {isCustom && onDeleteBoard && (
                      <button
                        className="btn btn-secondary btn-icon"
                        style={{ width: "30px", height: "30px", color: "var(--neon-rose)" }}
                        onClick={() => onDeleteBoard(b.id)}
                        title="Remove Custom Board"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Name & Sector */}
                <div style={{ fontSize: "0.92rem", fontWeight: "600", color: "#f1f5f9", marginBottom: "4px" }}>
                  {b.name}
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginBottom: "12px" }}>
                  {b.category}
                </div>

                {/* Feed Endpoint URL snippet */}
                <div style={{ 
                  fontSize: "0.7rem", 
                  color: "var(--neon-cyan)", 
                  background: "rgba(0, 0, 0, 0.3)", 
                  padding: "6px 10px", 
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.04)"
                }}>
                  <strong style={{ color: "var(--text-dim)" }}>Feed: </strong>{b.feed_url}
                </div>
              </div>

              {/* Telemetry card inside */}
              <div style={{ 
                background: "rgba(0, 0, 0, 0.3)", 
                borderRadius: "var(--radius-sm)", 
                padding: "12px",
                border: "1px solid rgba(255, 255, 255, 0.04)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Health Status</span>
                  {getStatusBadge(isEnabled ? b.last_status : "DISABLED")}
                </div>

                {/* Latency meter */}
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "3px" }}>
                    <span>Probe Latency</span>
                    <span className="mono" style={{ color: latency > 1000 ? "var(--neon-amber)" : "var(--neon-cyan)", fontWeight: "600" }}>
                      {isEnabled ? `${latency} ms` : "Standby"}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ 
                      width: `${latencyPct}%`, 
                      height: "100%", 
                      backgroundColor: latency > 1000 ? "var(--neon-amber)" : "var(--neon-emerald)",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                </div>

                {/* Sweeps performed */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)" }}>
                  <span>Total Sweeps: <strong style={{ color: "#ffffff" }}>{b.total_checks || 0}</strong></span>
                  <span>Interval: <strong style={{ color: "var(--neon-emerald)" }}>10s</strong></span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
