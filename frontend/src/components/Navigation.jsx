import React, { useState } from "react";
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
  Bell,
  Menu,
  X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "overview", label: "Command Center", icon: Radio },
    { id: "boards", label: "Boards", icon: Layers, badge: boardsCount },
    { id: "updates", label: "Updates", icon: FileText, badge: updatesCount > 0 ? updatesCount : null },
    { id: "outbox", label: "Outbox", icon: Mail, badge: outboxCount > 0 ? outboxCount : null, isOutbox: true },
    { id: "companies", label: "Companies", icon: Building, badge: companiesCount > 0 ? companiesCount : null },
    { id: "telemetry", label: "Telemetry Logs", icon: Activity },
    { id: "settings", label: "Settings", icon: Sliders },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="glass-panel nav-header-bar">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ 
            width: "38px", 
            height: "38px", 
            borderRadius: "10px", 
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(16, 185, 129, 0.25)",
            flexShrink: 0
          }}>
            <ShieldCheck className="animate-pulse-slow" style={{ color: "var(--neon-emerald)", width: "20px", height: "20px" }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.18rem", fontWeight: "800", color: "#ffffff", letterSpacing: "0.03em" }}>
                GUPTCHAR
              </span>
              <span className="badge badge-healthy" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                24*7 LIVE
              </span>
            </div>
            <p className="hide-mobile" style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
              10-Second Regulatory Surveillance Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop & Tablet) */}
        <nav className="nav-desktop-tabs hide-mobile scroll-touch-x">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)" : "transparent",
                  border: isActive ? "1px solid rgba(16, 185, 129, 0.45)" : "1px solid transparent",
                  color: isActive ? "#ffffff" : "var(--text-muted)",
                  fontWeight: isActive ? "700" : "500",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: isActive ? "0 0 14px rgba(16, 185, 129, 0.2)" : "none",
                  position: "relative"
                }}
              >
                <Icon size={14} color={isActive ? "var(--neon-emerald)" : "var(--text-dim)"} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <span style={{ 
                    fontSize: "0.65rem", 
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

          {/* Alert Center Trigger */}
          <button
            id="btn-nav-alert-center"
            className="btn btn-secondary btn-icon"
            onClick={onOpenAlertCenter}
            title={`Alert Center (${alertsCount} alerts)`}
            style={{
              position: "relative",
              width: "34px",
              height: "34px",
              border: criticalAlertsCount > 0 ? "1px solid rgba(239, 68, 68, 0.6)" : "1px solid var(--border-subtle)",
              background: criticalAlertsCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.06)",
              boxShadow: criticalAlertsCount > 0 ? "0 0 15px rgba(239, 68, 68, 0.35)" : "none"
            }}
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

          {/* Sound Toggle */}
          <button 
            id="btn-toggle-sound"
            className="btn btn-secondary btn-icon" 
            onClick={onToggleMute}
            style={{ width: "34px", height: "34px" }}
            title={isMuted ? "Unmute Sound Alerts" : "Mute Sound Alerts"}
          >
            {isMuted ? <VolumeX size={15} color="var(--text-dim)" /> : <Volume2 size={15} color="var(--neon-cyan)" />}
          </button>

          {/* Force Sweep (Desktop) */}
          <button 
            id="btn-force-sweep"
            className="btn btn-secondary hide-mobile" 
            style={{ padding: "6px 11px", fontSize: "0.76rem" }}
            onClick={onForceSweep}
            disabled={isSweeping}
            title="Force immediate 10s sweep across all boards"
          >
            <RotateCw size={13} className={isSweeping ? "animate-radar" : ""} />
            <span>Sweep Now</span>
          </button>

          {/* Add Board (Desktop) */}
          <button 
            id="btn-nav-add-board"
            className="btn btn-primary hide-mobile" 
            style={{ padding: "6px 12px", fontSize: "0.76rem" }}
            onClick={onOpenAddBoard}
          >
            <PlusCircle size={13} />
            <span>Add Board</span>
          </button>

          {/* User Profile & Logout (Desktop) */}
          {currentUser && (
            <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "2px", paddingLeft: "8px", borderLeft: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  fontSize: "0.72rem"
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
                style={{ width: "28px", height: "28px" }}
              >
                <LogOut size={13} color="var(--neon-rose)" />
              </button>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            id="btn-nav-mobile-menu"
            className="btn btn-secondary btn-icon nav-mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{ width: "34px", height: "34px" }}
          >
            {mobileMenuOpen ? <X size={18} color="var(--neon-cyan)" /> : <Menu size={18} color="#ffffff" />}
          </button>

        </div>

      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div style={{
          marginTop: "14px",
          paddingTop: "14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          {/* Mobile Navigation List */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "4px" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-mobile-tab-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: "var(--radius-md)",
                    background: isActive ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.2) 100%)" : "rgba(255, 255, 255, 0.03)",
                    border: isActive ? "1px solid rgba(16, 185, 129, 0.45)" : "1px solid rgba(255, 255, 255, 0.05)",
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                    fontWeight: isActive ? "700" : "500",
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Icon size={16} color={isActive ? "var(--neon-emerald)" : "var(--text-dim)"} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && (
                    <span style={{ 
                      fontSize: "0.68rem", 
                      padding: "2px 8px", 
                      borderRadius: "10px", 
                      background: isActive ? "rgba(16, 185, 129, 0.35)" : "rgba(255, 255, 255, 0.1)",
                      color: isActive ? "#ffffff" : "var(--text-dim)",
                      fontWeight: "700"
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Quick Action Buttons */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginTop: "8px",
            paddingTop: "10px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)"
          }}>
            <button
              id="btn-mobile-force-sweep"
              className="btn btn-secondary"
              style={{ width: "100%", padding: "8px 10px", fontSize: "0.78rem" }}
              onClick={() => {
                onForceSweep();
                setMobileMenuOpen(false);
              }}
              disabled={isSweeping}
            >
              <RotateCw size={13} className={isSweeping ? "animate-radar" : ""} />
              <span>Sweep Now</span>
            </button>

            <button
              id="btn-mobile-add-board"
              className="btn btn-primary"
              style={{ width: "100%", padding: "8px 10px", fontSize: "0.78rem" }}
              onClick={() => {
                onOpenAddBoard();
                setMobileMenuOpen(false);
              }}
            >
              <PlusCircle size={13} />
              <span>Add Board</span>
            </button>
          </div>

          {/* Mobile User Profile & Logout */}
          {currentUser && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              marginTop: "4px",
              background: "rgba(0, 0, 0, 0.35)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--neon-emerald)" }} />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#ffffff", fontWeight: "600" }}>{currentUser.name || currentUser.username}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Operator ({currentUser.role})</div>
                </div>
              </div>

              <button
                id="btn-mobile-logout"
                className="btn btn-secondary"
                style={{ padding: "5px 10px", fontSize: "0.74rem" }}
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut size={13} color="var(--neon-rose)" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

