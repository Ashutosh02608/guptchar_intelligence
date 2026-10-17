import React, { useState, useMemo } from "react";
import { 
  Bell, 
  X, 
  ShieldAlert, 
  Zap, 
  Radio, 
  CheckCheck, 
  ExternalLink, 
  ChevronRight, 
  Search, 
  Trash2, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Filter,
  Flame,
  ArrowUpRight
} from "lucide-react";

export function AlertCenterDrawer({
  isOpen,
  onClose,
  alerts = [],
  onSelectAlert,
  onDismissAlert,
  onAcknowledgeAll,
  onClearAll,
  isMuted,
  onToggleMute
}) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJurisdiction, setSelectedJurisdiction] = useState("ALL");

  const getJurisdictionFlag = (code) => {
    switch (code) {
      case "IN": return "🇮🇳";
      case "US": return "🇺🇸";
      case "UK": return "🇬🇧";
      case "EU": return "🇪🇺";
      default: return "🌐";
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return {
          badgeClass: "badge-critical",
          border: "rgba(239, 68, 68, 0.45)",
          glow: "rgba(239, 68, 68, 0.15)",
          icon: ShieldAlert,
          iconColor: "var(--neon-rose)"
        };
      case "HIGH":
        return {
          badgeClass: "badge-high",
          border: "rgba(245, 158, 11, 0.45)",
          glow: "rgba(245, 158, 11, 0.12)",
          icon: Zap,
          iconColor: "var(--neon-amber)"
        };
      default:
        return {
          badgeClass: "badge-medium",
          border: "rgba(6, 182, 212, 0.4)",
          glow: "rgba(6, 182, 212, 0.1)",
          icon: Radio,
          iconColor: "var(--neon-cyan)"
        };
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const diff = Math.floor(Date.now() / 1000 - timestamp);
    if (diff < 30) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Severity counts
  const criticalCount = useMemo(() => alerts.filter(a => a.severity === "CRITICAL").length, [alerts]);
  const highCount = useMemo(() => alerts.filter(a => a.severity === "HIGH").length, [alerts]);
  const unreadCount = useMemo(() => alerts.filter(a => !a.is_read).length, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(item => {
      if (filterSeverity === "CRITICAL" && item.severity !== "CRITICAL") return false;
      if (filterSeverity === "HIGH" && item.severity !== "HIGH") return false;
      if (filterSeverity === "UNREAD" && item.is_read) return false;
      if (selectedJurisdiction !== "ALL" && item.jurisdiction !== selectedJurisdiction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title?.toLowerCase().includes(q);
        const inBoard = item.board_name?.toLowerCase().includes(q);
        const inSummary = item.summary?.toLowerCase().includes(q);
        if (!inTitle && !inBoard && !inSummary) return false;
      }
      return true;
    });
  }, [alerts, filterSeverity, selectedJurisdiction, searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        justifyContent: "flex-end",
        padding: 0,
        background: "rgba(0, 0, 0, 0.65)"
      }}
    >
      <div 
        className="drawer-enter"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          height: "100vh",
          background: "linear-gradient(180deg, #0a0f1d 0%, #060a14 100%)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "-15px 0 45px rgba(0, 0, 0, 0.8), 0 0 30px rgba(6, 182, 212, 0.1)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 101
        }}
      >
        {/* Top Glow Accent Bar */}
        <div style={{
          height: "3px",
          width: "100%",
          background: criticalCount > 0 
            ? "linear-gradient(90deg, var(--neon-rose), var(--neon-amber), var(--neon-cyan))"
            : "linear-gradient(90deg, var(--neon-emerald), var(--neon-cyan), var(--neon-purple))"
        }} />

        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 16, 30, 0.7)",
          backdropFilter: "blur(12px)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: criticalCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(6, 182, 212, 0.15)",
                border: criticalCount > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(6, 182, 212, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Bell size={18} style={{ color: criticalCount > 0 ? "var(--neon-rose)" : "var(--neon-cyan)" }} className="animate-pulse-slow" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", letterSpacing: "0.02em", margin: 0 }}>
                    ALERT CENTER
                  </h2>
                  <span className="badge badge-healthy" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                    LIVE FEED
                  </span>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
                  High-Priority Directives & Urgent Regulatory Notices
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Sound Toggle */}
              <button
                className="btn btn-secondary btn-icon"
                style={{ width: "32px", height: "32px" }}
                onClick={onToggleMute}
                title={isMuted ? "Unmute Alert Sounds" : "Mute Alert Sounds"}
              >
                {isMuted ? <VolumeX size={15} color="var(--text-dim)" /> : <Volume2 size={15} color="var(--neon-cyan)" />}
              </button>

              {/* Close Drawer */}
              <button
                id="btn-close-alert-center"
                className="btn btn-secondary btn-icon"
                style={{ width: "32px", height: "32px" }}
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Metrics & Actions Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: "600" }}>Active:</span>
              <span className="badge badge-critical" style={{ fontSize: "0.68rem" }}>
                {criticalCount} Critical
              </span>
              <span className="badge badge-high" style={{ fontSize: "0.68rem" }}>
                {highCount} High
              </span>
              {unreadCount > 0 && (
                <span className="badge badge-medium" style={{ fontSize: "0.68rem" }}>
                  {unreadCount} Unread
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {unreadCount > 0 && (
                <button
                  id="btn-ack-all-alerts"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                  onClick={onAcknowledgeAll}
                  title="Mark all active alerts as read"
                >
                  <CheckCheck size={13} color="var(--neon-emerald)" />
                  <span>Ack All</span>
                </button>
              )}
              {alerts.length > 0 && (
                <button
                  id="btn-clear-all-alerts"
                  className="btn btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                  onClick={onClearAll}
                  title="Clear acknowledged alerts list"
                >
                  <Trash2 size={13} color="var(--text-dim)" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div style={{
          padding: "14px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          background: "rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Search alerts by title, regulator, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius-md)",
                padding: "8px 12px 8px 34px",
                fontSize: "0.82rem",
                color: "#ffffff",
                outline: "none"
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {[
              { id: "ALL", label: "All Alerts", count: alerts.length },
              { id: "CRITICAL", label: "Critical", count: criticalCount, icon: Flame, color: "var(--neon-rose)" },
              { id: "HIGH", label: "High", count: highCount, icon: Zap, color: "var(--neon-amber)" },
              { id: "UNREAD", label: "Unread", count: unreadCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterSeverity(tab.id)}
                style={{
                  background: filterSeverity === tab.id 
                    ? "rgba(6, 182, 212, 0.2)" 
                    : "rgba(255, 255, 255, 0.04)",
                  border: filterSeverity === tab.id 
                    ? "1px solid var(--neon-cyan)" 
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--radius-full)",
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  fontWeight: filterSeverity === tab.id ? "700" : "500",
                  color: filterSeverity === tab.id ? "#ffffff" : "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.icon && <tab.icon size={11} color={tab.color} />}
                <span>{tab.label}</span>
                <span style={{ 
                  background: "rgba(255, 255, 255, 0.1)", 
                  padding: "0 5px", 
                  borderRadius: "8px", 
                  fontSize: "0.65rem",
                  color: filterSeverity === tab.id ? "#ffffff" : "var(--text-dim)"
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts Scrollable Feed */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {filteredAlerts.length === 0 ? (
            <div style={{
              height: "100%",
              minHeight: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: "var(--text-dim)",
              padding: "40px 20px"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px"
              }}>
                <CheckCircle2 size={28} color="var(--neon-emerald)" />
              </div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
                Surveillance Radar Clear
              </h4>
              <p style={{ fontSize: "0.78rem", maxWidth: "300px", lineHeight: 1.5, margin: 0 }}>
                {searchQuery 
                  ? "No alerts matching current search query or filter." 
                  : "No pending unacknowledged alerts. The 24*7 surveillance engine is monitoring all regulatory feeds."}
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const style = getSeverityStyle(alert.severity);
              const Icon = style.icon;
              const flag = getJurisdictionFlag(alert.jurisdiction);
              const isUnread = !alert.is_read;

              return (
                <div
                  key={alert.id}
                  className="glass-panel"
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${isUnread ? style.border : "rgba(255, 255, 255, 0.08)"}`,
                    background: isUnread ? `linear-gradient(135deg, ${style.glow} 0%, rgba(14, 21, 37, 0.8) 100%)` : "rgba(14, 21, 37, 0.6)",
                    boxShadow: isUnread && alert.severity === "CRITICAL" ? "0 0 20px rgba(239, 68, 68, 0.2)" : "none",
                    transition: "all 0.2s ease",
                    cursor: "pointer"
                  }}
                  onClick={() => onSelectAlert(alert)}
                >
                  {/* Top Bar of Alert Card */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`badge ${style.badgeClass}`} style={{ fontSize: "0.65rem", padding: "1px 7px" }}>
                        <Icon size={11} style={{ marginRight: "3px" }} />
                        {alert.severity || "INFO"}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8" }}>
                        {flag} {alert.board_name || alert.board_id}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                        {formatRelativeTime(alert.detected_at)}
                      </span>
                      {onDismissAlert && (
                        <button
                          className="btn btn-secondary btn-icon"
                          style={{ width: "22px", height: "22px", padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissAlert(alert.id);
                          }}
                          title="Dismiss from alert center"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={{
                    fontSize: "0.88rem",
                    fontWeight: isUnread ? "700" : "600",
                    color: isUnread ? "#ffffff" : "var(--text-main)",
                    lineHeight: 1.4,
                    marginBottom: "8px"
                  }}>
                    {alert.title}
                  </h4>

                  {/* Snippet / Category */}
                  {alert.summary && (
                    <p style={{
                      fontSize: "0.76rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.45,
                      marginBottom: "10px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {alert.summary}
                    </p>
                  )}

                  {/* Footer Action Bar */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "8px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    fontSize: "0.72rem"
                  }}>
                    <span style={{
                      color: "var(--text-dim)",
                      fontSize: "0.68rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      padding: "2px 6px",
                      borderRadius: "4px"
                    }}>
                      {alert.category || "Regulatory Update"}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {alert.url && (
                        <a
                          href={alert.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: "var(--neon-cyan)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            textDecoration: "none",
                            fontWeight: "600"
                          }}
                        >
                          <span>Official Source</span>
                          <ArrowUpRight size={11} />
                        </a>
                      )}
                      <button
                        className="btn btn-primary"
                        style={{ padding: "3px 10px", fontSize: "0.72rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAlert(alert);
                        }}
                      >
                        <span>Inspect</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(0, 0, 0, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.72rem",
          color: "var(--text-dim)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--neon-emerald)" }} />
            <span>Surveillance Engine Connected (SEBI • RBI • SEC • FCA • ESMA)</span>
          </div>
          <span>Guptchar Radar</span>
        </div>
      </div>
    </div>
  );
}
