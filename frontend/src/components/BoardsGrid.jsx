import React from "react";
import { ExternalLink, CheckCircle2, AlertCircle, XCircle, Power, Wifi } from "lucide-react";

export function BoardsGrid({ boards, onToggleBoard, hideHeader = false }) {
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
    <div style={{ marginBottom: hideHeader ? "0" : "24px" }}>
      {!hideHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
            <Wifi size={18} color="var(--neon-emerald)" />
            MONITORED REGULATION AUTHORITIES
          </h2>
          <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
            10-second polling cadence • Auto-reconnection enabled
          </span>
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: hideHeader ? "1fr" : "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", 
        gap: hideHeader ? "10px" : "12px" 
      }}>
        {boards.map((b) => {
          const jur = getJurisdictionBadge(b.jurisdiction);
          const isEnabled = b.enabled;
          const latency = b.last_latency_ms || 0;

          return (
            <div 
              key={b.id} 
              style={{ 
                padding: hideHeader ? "10px 12px" : "16px", 
                background: "rgba(10, 16, 28, 0.75)",
                borderRadius: "var(--radius-md)",
                opacity: isEnabled ? 1 : 0.6,
                border: isEnabled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px dashed rgba(255, 255, 255, 0.12)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: hideHeader ? "6px" : "12px",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                {/* Header: Short Code, Flag, and Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hideHeader ? "3px" : "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: hideHeader ? "0.95rem" : "1.1rem" }}>{jur.flag}</span>
                    <span className="mono" style={{ fontSize: hideHeader ? "0.85rem" : "0.95rem", fontWeight: "700", color: "#ffffff" }}>
                      {b.short_code}
                    </span>
                    <span style={{ fontSize: "0.66rem", color: "var(--text-dim)", fontWeight: "500" }}>
                      {jur.label}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    {/* Toggle button */}
                    <button
                      id={`toggle-board-${b.id}`}
                      className="btn btn-secondary btn-icon"
                      style={{ 
                        width: "24px", 
                        height: "24px", 
                        color: isEnabled ? "var(--neon-emerald)" : "var(--text-dim)" 
                      }}
                      onClick={() => onToggleBoard(b.id, !isEnabled)}
                      title={isEnabled ? "Pause Monitoring" : "Resume Monitoring"}
                    >
                      <Power size={12} />
                    </button>
                    
                    <a 
                      href={b.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary btn-icon"
                      style={{ width: "24px", height: "24px" }}
                      title="Visit Official Regulatory Portal"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Authority Full Name */}
                <div style={{ 
                  fontSize: hideHeader ? "0.76rem" : "0.82rem", 
                  fontWeight: "600", 
                  color: "#cbd5e1", 
                  marginBottom: hideHeader ? "1px" : "2px", 
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {b.name}
                </div>
                {!hideHeader && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginBottom: "10px" }}>
                    {b.category}
                  </div>
                )}
              </div>

              {/* Health Status & Latency (Number Only) */}
              <div style={{ 
                background: "rgba(0, 0, 0, 0.3)", 
                borderRadius: "var(--radius-sm)", 
                padding: hideHeader ? "5px 8px" : "8px 12px",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "500" }}>Status</span>
                  {getStatusBadge(isEnabled ? b.last_status : "DISABLED")}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Latency:</span>
                  <span className="mono" style={{ 
                    fontSize: "0.74rem", 
                    color: !isEnabled ? "var(--text-dim)" : (latency > 1000 ? "var(--neon-amber)" : "var(--neon-cyan)"),
                    fontWeight: "600"
                  }}>
                    {isEnabled ? `${latency} ms` : "Paused"}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
