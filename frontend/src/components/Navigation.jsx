import React from "react";
import { 
  Radio, 
  Layers, 
  FileText, 
  Mail,
  Activity, 
  Sliders, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  ShieldCheck,
  Building,
  LogOut,
  Bell
} from "lucide-react";

export function Navigation({ 
  activeTab, 
  setActiveTab, 
  isSweeping, 
  onForceSweep, 
  onOpenAddBoard, 
  isMuted, 
  onToggleMute,
  boardsCount,
  updatesCount,
  outboxCount,
  companiesCount,
  alertsCount = 0,
  criticalAlertsCount = 0,
  onOpenAlertCenter,
  currentUser,
  onLogout
}) {
  const navItems = [
    { id: "overview", label: "Command Center", icon: Radio },
    { id: "boards", label: "Boards", icon: Layers, badge: boardsCount },
    { id: "updates", label: "Updates", icon: FileText, badge: updatesCount > 0 ? updatesCount : null },
    { id: "outbox", label: "Outbox", icon: Mail, badge: outboxCount > 0 ? outboxCount : null, isOutbox: true },
    { id: "companies", label: "Companies", icon: Building, badge: companiesCount > 0 ? companiesCount : null },
    { id: "telemetry", label: "Telemetry Logs", icon: Activity },
    { id: "settings", label: "Settings", icon: Sliders },
  ];

  return (
    <header className="glass-panel" style={{ padding: "14px 24px", marginBottom: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ 
            width: "42px", 
            height: "42px", 
            borderRadius: "10px", 
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: "0 0 18px rgba(16, 185, 129, 0.25)"
          }}>
            <ShieldCheck className="animate-pulse-slow" style={{ color: "var(--neon-emerald)", width: "22px", height: "22px" }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: "800", color: "#ffffff", letterSpacing: "0.03em" }}>
                GUPTCHAR
              </span>
              <span className="badge badge-healthy" style={{ fontSize: "0.65rem", padding: "1px 7px" }}>
                24*7 LIVE
              </span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
              10-Second Regulatory Surveillance Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Pages Options) */}
        <nav style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "4px", 
          background: "rgba(0, 0, 0, 0.35)", 
          padding: "4px", 
          borderRadius: "var(--radius-full)",
          border: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "7px 16px",
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)" : "transparent",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.45)" : "1px solid transparent",
                  color: isActive ? "#ffffff" : "var(--text-muted)",
                  fontWeight: isActive ? "700" : "500",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "0 0 15px rgba(16, 185, 129, 0.2)" : "none",
                  position: "relative"
                }}
              >
                <Icon size={15} color={isActive ? "var(--neon-emerald)" : "var(--text-dim)"} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <span style={{ 
                    fontSize: "0.68rem", 
                    padding: "1px 6px", 
                    borderRadius: "10px", 
                    background: isActive ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)",
                    color: isActive ? "#ffffff" : "var(--text-dim)",
                    fontWeight: "600"
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

          {/* Alert Center Trigger */}
          <button
            id="btn-nav-alert-center"
            className="btn btn-secondary btn-icon"
            onClick={onOpenAlertCenter}
            title={`Alert Center (${alertsCount} alerts)`}
            style={{
              position: "relative",
              border: criticalAlertsCount > 0 ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid var(--border-subtle)",
              background: criticalAlertsCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)",
              boxShadow: criticalAlertsCount > 0 ? "0 0 15px rgba(239, 68, 68, 0.35)" : "none"
            }}
          >
            <Bell 
              size={16} 
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
                fontSize: "0.62rem",
                fontWeight: "800",
                width: "18px",
                height: "18px",
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

          {/* Sound Toggle */}
          <button 
            id="btn-toggle-sound"
            className="btn btn-secondary btn-icon" 
            onClick={onToggleMute}
            title={isMuted ? "Unmute Sound Alerts" : "Mute Sound Alerts"}
          >
            {isMuted ? <VolumeX size={16} color="var(--text-dim)" /> : <Volume2 size={16} color="var(--neon-cyan)" />}
          </button>

          {/* Force Sweep */}
          <button 
            id="btn-force-sweep"
            className="btn btn-secondary" 
            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            onClick={onForceSweep}
            disabled={isSweeping}
            title="Force immediate 10s sweep across all boards"
          >
            <RotateCw size={14} className={isSweeping ? "animate-radar" : ""} />
            <span>Sweep Now</span>
          </button>

          {/* Add Board */}
          <button 
            id="btn-nav-add-board"
            className="btn btn-primary" 
            style={{ padding: "6px 14px", fontSize: "0.78rem" }}
            onClick={onOpenAddBoard}
          >
            <PlusCircle size={14} />
            <span>Add Board</span>
          </button>

          {/* User Profile & Logout */}
          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px", paddingLeft: "10px", borderLeft: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "0.74rem"
                }}
                title={`Operator: ${currentUser.name || currentUser.username} (${currentUser.role})`}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--neon-emerald)" }} />
                <span style={{ color: "#ffffff", fontWeight: "600" }}>{currentUser.username}</span>
              </div>

              <button
                id="btn-nav-logout"
                className="btn btn-secondary btn-icon"
                onClick={onLogout}
                title="Sign out of Guptchar"
                style={{ width: "30px", height: "30px" }}
              >
                <LogOut size={14} color="var(--neon-rose)" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
