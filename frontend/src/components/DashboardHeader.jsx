import React from "react";
import { 
  RotateCw, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Bell, 
  Menu,
  ShieldCheck,
  Radio,
  Layers,
  FileText,
  Mail,
  Building,
  Activity,
  Sliders
} from "lucide-react";

export function DashboardHeader({
  activeTab,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  onOpenMobileSidebar,
  isSweeping,
  onForceSweep,
  onOpenAddBoard,
  isMuted,
  onToggleMute,
  alertsCount = 0,
  criticalAlertsCount = 0,
  onOpenAlertCenter,
  currentUser,
  wsConnected = false
}) {
  const getTabMeta = (tabId) => {
    switch (tabId) {
      case "overview": return { title: "Command Center", subtitle: "24*7 Real-Time Surveillance Radar", icon: Radio };
      case "boards": return { title: "Regulatory Boards", subtitle: "Global Monitored Authorities", icon: Layers };
      case "updates": return { title: "Live Updates Feed", subtitle: "Continuous Indexed Circulars", icon: FileText };
      case "outbox": return { title: "Regulatory Outbox", subtitle: "AI Entity Extraction & Human Review Queue", icon: Mail };
      case "companies": return { title: "Company Intelligence", subtitle: "Corporate Registry & Leadership CRM", icon: Building };
      case "telemetry": return { title: "Network Telemetry", subtitle: "10-Second Probe Audit Trail", icon: Activity };
      case "settings": return { title: "Surveillance Settings", subtitle: "Audio, Watermark & Ingest Controls", icon: Sliders };
      default: return { title: "Surveillance Console", subtitle: "Autonomous Financial Monitor", icon: Radio };
    }
  };

  const meta = getTabMeta(activeTab);
  const TabIcon = meta.icon;

  return (
    <header 
      className="dashboard-topbar glass-panel"
      style={{
        padding: "12px 18px",
        marginBottom: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        borderRadius: "var(--radius-lg)"
      }}
    >
      {/* Left: Sidebar Toggle & Section Title Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          id="btn-header-mobile-drawer"
          onClick={onOpenMobileSidebar}
          className="btn btn-secondary btn-icon nav-mobile-toggle-btn"
          style={{ width: "34px", height: "34px" }}
          aria-label="Open sidebar menu"
        >
          <Menu size={18} color="#ffffff" />
        </button>

        {/* Active Page Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "rgba(6, 182, 212, 0.15)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <TabIcon size={16} color="var(--neon-cyan)" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.08rem", fontWeight: "800", color: "#ffffff", letterSpacing: "0.02em", margin: 0 }}>
                {meta.title}
              </h1>
              <span className="badge badge-healthy hide-mobile" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                10S CADENCE
              </span>
            </div>
            <p className="hide-mobile" style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
              {meta.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Operational Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        
        {/* Force Sweep Button */}
        <button
          id="btn-topbar-sweep"
          onClick={onForceSweep}
          disabled={isSweeping}
          className="btn btn-secondary hide-mobile"
          style={{ padding: "6px 12px", fontSize: "0.76rem" }}
          title="Force immediate 10s sweep across all boards"
        >
          <RotateCw size={13} className={isSweeping ? "animate-radar" : ""} color="var(--neon-emerald)" />
          <span>Sweep Now</span>
        </button>

        {/* Add Board Button */}
        <button
          id="btn-topbar-add-board"
          onClick={onOpenAddBoard}
          className="btn btn-primary hide-mobile"
          style={{ padding: "6px 12px", fontSize: "0.76rem" }}
          title="Add regulatory board"
        >
          <PlusCircle size={13} />
          <span>Add Board</span>
        </button>

        {/* Sound Toggle Button */}
        <button
          id="btn-topbar-sound"
          onClick={onToggleMute}
          className="btn btn-secondary btn-icon"
          style={{ width: "34px", height: "34px" }}
          title={isMuted ? "Unmute Sound Alerts" : "Mute Sound Alerts"}
        >
          {isMuted ? <VolumeX size={15} color="var(--text-dim)" /> : <Volume2 size={15} color="var(--neon-cyan)" />}
        </button>

        {/* Alert Center Trigger */}
        <button
          id="btn-topbar-alert-center"
          onClick={onOpenAlertCenter}
          className="btn btn-secondary btn-icon"
          style={{
            position: "relative",
            width: "34px",
            height: "34px",
            border: criticalAlertsCount > 0 ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid var(--border-subtle)",
            background: criticalAlertsCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)",
            boxShadow: criticalAlertsCount > 0 ? "0 0 15px rgba(239, 68, 68, 0.35)" : "none"
          }}
          title={`Alert Center (${alertsCount} alerts)`}
        >
          <Bell 
            size={15} 
            color={criticalAlertsCount > 0 ? "var(--neon-rose)" : alertsCount > 0 ? "var(--neon-amber)" : "var(--neon-cyan)"} 
            className={criticalAlertsCount > 0 ? "animate-pulse-slow" : ""}
          />
          {alertsCount > 0 && (
            <span style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: criticalAlertsCount > 0 ? "var(--neon-rose)" : "var(--neon-amber)",
              color: "#ffffff",
              fontSize: "0.6rem",
              fontWeight: "800",
              width: "17px",
              height: "17px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 8px rgba(0, 0, 0, 0.8)",
              border: "2px solid #070a12"
            }}>
              {alertsCount > 9 ? "9+" : alertsCount}
            </span>
          )}
        </button>

        {/* Operator Session Tag (Desktop) */}
        {currentUser && (
          <div className="hide-mobile" style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(0, 0, 0, 0.35)",
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "0.72rem",
            marginLeft: "4px"
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--neon-emerald)" }} />
            <span style={{ color: "#ffffff", fontWeight: "600" }}>{currentUser.username}</span>
          </div>
        )}
      </div>
    </header>
  );
}
