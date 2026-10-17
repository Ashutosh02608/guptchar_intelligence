import React from "react";
import { ExternalLink, CheckCircle2, AlertCircle, XCircle, Power, Wifi } from "lucide-react";

export function BoardsGrid({ boards, onToggleBoard }) {
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
        return (
          <span className="badge badge-healthy">
            <CheckCircle2 size={12} /> ONLINE
          </span>
        );
      case "DEGRADED":
        return (
          <span className="badge badge-degraded">
            <AlertCircle size={12} /> DEGRADED
          </span>
        );
      case "ERROR":
        return (
          <span className="badge badge-error">
            <XCircle size={12} /> ERROR
          </span>
        );
      default:
        return (
          <span className="badge badge-info">
            CONNECTING...
          </span>
        );
    }
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
          <Wifi size={18} color="var(--neon-emerald)" />
          MONITORED REGULATION AUTHORITIES
        </h2>
        <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
          10-second polling cadence • Auto-reconnection enabled
        </span>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "14px" 
      }}>
        {boards.map((b) => {
          const jur = getJurisdictionBadge(b.jurisdiction);
          const isEnabled = b.enabled;
          const latency = b.last_latency_ms || 0;
          // Latency percentage for mini progress bar (0 - 1500ms scale)
          const latencyPct = Math.min(100, Math.max(5, (latency / 1200) * 100));

          return (
            <div 
              key={b.id} 
              className="glass-panel" 
              style={{ 
                padding: "16px", 
                opacity: isEnabled ? 1 : 0.6,
                border: isEnabled ? undefined : "1px dashed rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px"
              }}
            >
              <div>
                {/* Header: Short Code, Flag, and Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.1rem" }}>{jur.flag}</span>
                    <span className="mono" style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff" }}>
                      {b.short_code}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: "500" }}>
                      {jur.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Toggle button */}
                    <button
                      id={`toggle-board-${b.id}`}
                      className="btn btn-secondary btn-icon"
                      style={{ 
                        width: "28px", 
                        height: "28px", 
                        color: isEnabled ? "var(--neon-emerald)" : "var(--text-dim)" 
                      }}
                      onClick={() => onToggleBoard(b.id, !isEnabled)}
                      title={isEnabled ? "Pause Monitoring" : "Resume Monitoring"}
                    >
                      <Power size={14} />
                    </button>
                    
                    <a 
                      href={b.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary btn-icon"
                      style={{ width: "28px", height: "28px" }}
                      title="Visit Official Regulatory Portal"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Authority Full Name */}
                <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#cbd5e1", marginBottom: "4px" }}>
                  {b.name}
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginBottom: "10px" }}>
                  {b.category}
                </div>
              </div>

              {/* Status and Latency Telemetry */}
              <div style={{ 
                background: "rgba(0, 0, 0, 0.25)", 
                borderRadius: "var(--radius-sm)", 
                padding: "10px",
                border: "1px solid rgba(255, 255, 255, 0.04)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Health Status</span>
                  {getStatusBadge(isEnabled ? b.last_status : "DISABLED")}
                </div>

                {/* Latency micro bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "3px" }}>
                    <span>Response Latency</span>
                    <span className="mono" style={{ color: latency > 1000 ? "var(--neon-amber)" : "var(--neon-cyan)" }}>
                      {isEnabled ? `${latency} ms` : "Paused"}
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

                {/* Total checks & errors info */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.68rem", color: "var(--text-dim)" }}>
                  <span>Sweeps: <strong style={{ color: "#94a3b8" }}>{b.total_checks || 0}</strong></span>
                  {b.error_count > 0 && (
                    <span style={{ color: "var(--neon-amber)" }}>Anomalies: {b.error_count}</span>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
