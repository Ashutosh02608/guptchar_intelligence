import React, { useState } from "react";
import { 
  Radio, 
  Layers, 
  FileText, 
  Mail,
  Activity, 
  Sliders, 
  ShieldCheck, 
  Building, 
  LogOut, 
  PanelLeftClose, 
  PanelLeftOpen,
  Calendar
} from "lucide-react";

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  setActiveTab,
  isSweeping,
  onForceSweep,
  onOpenAddBoard,
  isMuted,
  onToggleMute,
  boardsCount = 0,
  updatesCount = 0,
  outboxCount = 0,
  companiesCount = 0,
  alertsCount = 0,
  criticalAlertsCount = 0,
  onOpenAlertCenter,
  currentUser,
  onLogout,
  wsConnected = false,
  uptime = 0,
  isMobileOpen = false,
  onCloseMobile
}) {
  const [hoveredTab, setHoveredTab] = useState(null);

  const navItems = [
    { 
      id: "overview", 
      label: "Command Center", 
      icon: Radio,
      shortcut: "1",
      badge: null
    },
    { 
      id: "boards", 
      label: "Regulatory Boards", 
      icon: Layers, 
      shortcut: "2",
      badge: boardsCount > 0 ? boardsCount : null
    },
    { 
      id: "updates", 
      label: "Updates Stream", 
      icon: FileText, 
      shortcut: "3",
      badge: updatesCount > 0 ? updatesCount : null,
      badgeColor: "var(--neon-cyan)"
    },
    { 
      id: "outbox", 
      label: "Regulatory Outbox", 
      icon: Mail, 
      shortcut: "4",
      badge: outboxCount > 0 ? outboxCount : null,
      badgeColor: "var(--neon-amber)"
    },
    { 
      id: "calendar", 
      label: "Compliance Calendar", 
      icon: Calendar, 
      shortcut: "5",
      badge: null,
      badgeColor: "var(--neon-emerald)"
    },
    { 
      id: "companies", 
      label: "Company CRM", 
      icon: Building, 
      shortcut: "5",
      badge: companiesCount > 0 ? companiesCount : null 
    },
    { 
      id: "telemetry", 
      label: "Telemetry Logs", 
      icon: Activity, 
      shortcut: "6",
      badge: null 
    },
    { 
      id: "settings", 
      label: "Engine Settings", 
      icon: Sliders, 
      shortcut: "7",
      badge: null 
    },
  ];

  const formatUptime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return "00:00:00";
    const sec = Math.floor(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 998,
            transition: "opacity 0.25s ease"
          }}
        />
      )}

      {/* Main Sidebar Chassis */}
      <aside 
        className={`dashboard-sidebar ${isCollapsed ? "collapsed" : "expanded"} ${isMobileOpen ? "mobile-open" : ""}`}
        style={{
          width: isCollapsed ? "72px" : "280px",
          minWidth: isCollapsed ? "72px" : "280px",
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "linear-gradient(180deg, #090d18 0%, #060912 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: isCollapsed ? "4px 0 25px rgba(0, 0, 0, 0.4)" : "6px 0 35px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 999,
          transition: "width 0.28s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
          userSelect: "none"
        }}
      >
        {/* Top Fixed Header: Brand & Collapse Toggle */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            padding: isCollapsed ? "16px 0" : "15px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            gap: isCollapsed ? 0 : "8px",
            position: "relative"
          }}>
            {/* Brand Logo & Name */}
            <div 
              onClick={() => handleTabSelect("overview")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "flex-start",
                gap: isCollapsed ? 0 : "10px",
                cursor: "pointer",
                minWidth: 0,
                width: isCollapsed ? "100%" : "auto",
                flex: isCollapsed ? "none" : 1
              }}
              title="Guptchar Autonomous Surveillance"
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.22)",
                flexShrink: 0,
                margin: isCollapsed ? "0 auto" : 0
              }}>
                <ShieldCheck className="animate-pulse-slow" style={{ color: "var(--neon-emerald)", width: "20px", height: "20px" }} />
              </div>

              {!isCollapsed && (
                <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ 
                      fontSize: "1.05rem", 
                      fontWeight: "800", 
                      color: "#ffffff", 
                      letterSpacing: "0.03em",
                      lineHeight: 1.2,
                      whiteSpace: "nowrap"
                    }}>
                      GUPTCHAR
                    </span>
                    <span className="badge badge-healthy" style={{ 
                      fontSize: "0.58rem", 
                      padding: "1px 5px",
                      flexShrink: 0,
                      fontWeight: "700"
                    }}>
                      24*7
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: "0.68rem", 
                    color: "var(--text-muted)", 
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    Surveillance Engine
                  </div>
                </div>
              )}
            </div>

            {/* Collapse/Expand Toggle Button */}
            {!isCollapsed ? (
              <button
                id="btn-sidebar-collapse"
                onClick={onToggleCollapse}
                className="btn btn-secondary btn-icon"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.05)",
                  flexShrink: 0
                }}
                title="Collapse sidebar"
              >
                <PanelLeftClose size={15} color="var(--text-dim)" />
              </button>
            ) : null}
          </div>

          {/* Expand Toggle when Collapsed */}
          {isCollapsed && (
            <div style={{ padding: "8px 0 4px", display: "flex", justifyContent: "center" }}>
              <button
                id="btn-sidebar-expand"
                onClick={onToggleCollapse}
                className="btn btn-secondary btn-icon"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(255, 255, 255, 0.04)"
                }}
                title="Expand sidebar"
              >
                <PanelLeftOpen size={16} color="var(--neon-cyan)" />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Middle Section (Telemetry, Navigation, Surveillance Controls) */}
        <div 
          className="sidebar-scroll-area"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Quick Engine Telemetry Bar in Sidebar */}
          {!isCollapsed && (
            <div style={{
              margin: "12px 14px 4px",
              padding: "10px 12px",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ 
                  width: "7px", 
                  height: "7px", 
                  borderRadius: "50%", 
                  background: wsConnected ? "var(--neon-emerald)" : "var(--neon-amber)",
                  boxShadow: wsConnected ? "0 0 8px var(--neon-emerald)" : "0 0 8px var(--neon-amber)"
                }} />
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#ffffff" }}>
                    {wsConnected ? "STREAM LIVE" : "CONNECTING..."}
                  </div>
                  <div style={{ fontSize: "0.64rem", color: "var(--text-dim)" }}>
                    10s Polling Cycle
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span className="mono" style={{ fontSize: "0.76rem", color: "var(--neon-cyan)", fontWeight: "600" }}>
                  {formatUptime(uptime)}
                </span>
                <div style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>
                  Surveillance
                </div>
              </div>
            </div>
          )}

          {/* Primary Navigation Menu */}
          <nav style={{ padding: isCollapsed ? "12px 8px" : "12px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {!isCollapsed && (
              <div style={{ 
                fontSize: "0.66rem", 
                fontWeight: "700", 
                color: "var(--text-dim)", 
                letterSpacing: "0.08em", 
                padding: "4px 8px 6px",
                textTransform: "uppercase" 
              }}>
                Surveillance Modules
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isHovered = hoveredTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => handleTabSelect(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    width: "100%",
                    padding: isCollapsed ? "11px 0" : "9px 12px",
                    borderRadius: "8px",
                    background: isActive 
                      ? "linear-gradient(90deg, rgba(6, 182, 212, 0.18) 0%, rgba(16, 185, 129, 0.14) 100%)" 
                      : (isHovered ? "rgba(255, 255, 255, 0.04)" : "transparent"),
                    border: isActive 
                      ? "1px solid rgba(6, 182, 212, 0.4)" 
                      : "1px solid transparent",
                    borderLeft: isActive 
                      ? "3px solid var(--neon-cyan)" 
                      : "3px solid transparent",
                    color: isActive ? "#ffffff" : (isHovered ? "#e2e8f0" : "var(--text-muted)"),
                    cursor: "pointer",
                    transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative",
                    textDecoration: "none"
                  }}
                  title={isCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : undefined}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                    <Icon 
                      size={18} 
                      color={isActive ? "var(--neon-emerald)" : (isHovered ? "var(--neon-cyan)" : "var(--text-dim)")} 
                      style={{ flexShrink: 0 }}
                    />
                    {!isCollapsed && (
                      <span style={{ 
                        fontSize: "0.82rem", 
                        fontWeight: isActive ? "700" : "500",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Badge */}
                  {item.badge !== null && item.badge !== undefined && (
                    <>
                      {!isCollapsed ? (
                        <span style={{
                          fontSize: "0.68rem",
                          fontWeight: "700",
                          padding: "2px 7px",
                          borderRadius: "10px",
                          background: item.badgeColor ? `rgba(245, 158, 11, 0.2)` : (isActive ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.08)"),
                          color: item.badgeColor || (isActive ? "var(--neon-emerald)" : "#cbd5e1"),
                          border: `1px solid ${item.badgeColor ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                          flexShrink: 0
                        }}>
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : (
                        /* Collapsed Pip Indicator */
                        <span style={{
                          position: "absolute",
                          top: "6px",
                          right: "12px",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: item.badgeColor || "var(--neon-cyan)",
                          boxShadow: `0 0 8px ${item.badgeColor || "var(--neon-cyan)"}`
                        }} />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Operator Account & Session Logout */}
        <div style={{
          flexShrink: 0,
          padding: isCollapsed ? "14px 0" : "14px 14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(0, 0, 0, 0.25)"
        }}>
          {currentUser ? (
            <div style={{
              display: "flex",
              flexDirection: isCollapsed ? "column" : "row",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              gap: "8px"
            }}>
              {!isCollapsed ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)",
                    border: "1px solid var(--neon-emerald)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    flexShrink: 0
                  }}>
                    {(currentUser.name || currentUser.username || "O").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ 
                      fontSize: "0.78rem", 
                      fontWeight: "700", 
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {currentUser.name || currentUser.username}
                    </div>
                    <div style={{ fontSize: "0.66rem", color: "var(--neon-emerald)", fontWeight: "500" }}>
                      ● Operator ({currentUser.role || "Officer"})
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid var(--neon-emerald)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: "700"
                  }}
                  title={`Operator: ${currentUser.username} (${currentUser.role})`}
                >
                  {(currentUser.name || currentUser.username || "O").charAt(0).toUpperCase()}
                </div>
              )}

              <button
                id="btn-sidebar-logout"
                onClick={onLogout}
                className="btn btn-secondary btn-icon"
                style={{ 
                  width: "28px", 
                  height: "28px", 
                  borderRadius: "6px",
                  flexShrink: 0,
                  marginTop: isCollapsed ? "8px" : 0
                }}
                title="Sign out of Guptchar"
              >
                <LogOut size={13} color="var(--neon-rose)" />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-dim)" }}>
              {!isCollapsed ? "Guptchar Autonomous Engine v1.2" : "v1.2"}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
