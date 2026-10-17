import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, 
  Zap, 
  Radio, 
  X, 
  ChevronRight, 
  Bell, 
  ExternalLink,
  Flame,
  ArrowRight
} from "lucide-react";

export function AlertBanner({ 
  alert, 
  onDismiss, 
  onViewDetails,
  onOpenAlertCenter,
  queueCount = 0
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const DURATION_MS = 9000;
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(DURATION_MS);

  const getJurisdictionFlag = (code) => {
    switch (code) {
      case "IN": return "🇮🇳";
      case "US": return "🇺🇸";
      case "UK": return "🇬🇧";
      case "EU": return "🇪🇺";
      default: return "🌐";
    }
  };

  useEffect(() => {
    if (!alert) return;

    setProgress(100);
    remainingTimeRef.current = DURATION_MS;
    startTimeRef.current = Date.now();

    const interval = 50; // update every 50ms
    progressIntervalRef.current = setInterval(() => {
      if (isPaused) return;

      const elapsed = Date.now() - startTimeRef.current;
      const left = Math.max(0, remainingTimeRef.current - elapsed);
      const pct = (left / DURATION_MS) * 100;
      setProgress(pct);

      if (left <= 0) {
        clearInterval(progressIntervalRef.current);
        onDismiss();
      }
    }, interval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [alert, onDismiss, isPaused]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now();
    remainingTimeRef.current = (progress / 100) * DURATION_MS;
  };

  if (!alert) return null;

  const isCritical = alert.severity === "CRITICAL";
  const isHigh = alert.severity === "HIGH";
  const flag = getJurisdictionFlag(alert.jurisdiction);

  const accentColor = isCritical 
    ? "var(--neon-rose)" 
    : isHigh 
      ? "var(--neon-amber)" 
      : "var(--neon-cyan)";

  const borderColor = isCritical 
    ? "rgba(239, 68, 68, 0.7)" 
    : isHigh 
      ? "rgba(245, 158, 11, 0.7)" 
      : "rgba(6, 182, 212, 0.7)";

  const IconComponent = isCritical ? ShieldAlert : isHigh ? Zap : Radio;

  return (
    <div 
      className={`alert-toast-container alert-toast-enter ${isCritical ? "alert-glow-critical" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 9999,
        width: "calc(100% - 48px)",
        maxWidth: "480px",
        background: "linear-gradient(135deg, rgba(14, 21, 37, 0.96) 0%, rgba(8, 12, 24, 0.98) 100%)",
        border: `1.5px solid ${borderColor}`,
        boxShadow: isCritical 
          ? "0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.35)" 
          : "0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 30px rgba(245, 158, 11, 0.25)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease"
      }}
    >
      {/* Depleting Progress Bar */}
      <div style={{
        height: "3px",
        width: "100%",
        background: "rgba(255, 255, 255, 0.1)",
        position: "relative"
      }}>
        <div style={{
          height: "100%",
          width: `${progress}%`,
          background: accentColor,
          boxShadow: `0 0 10px ${accentColor}`,
          transition: isPaused ? "none" : "width 50ms linear"
        }} />
      </div>

      <div style={{ padding: "18px 20px" }}>
        {/* Top Header Row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ 
              width: "36px", 
              height: "36px", 
              borderRadius: "10px", 
              background: isCritical ? "rgba(239, 68, 68, 0.2)" : isHigh ? "rgba(245, 158, 11, 0.2)" : "rgba(6, 182, 212, 0.2)",
              border: `1px solid ${borderColor}`,
              color: accentColor,
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 14px ${accentColor}44`
            }}>
              <IconComponent size={20} className={isCritical ? "animate-pulse-slow" : ""} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ 
                  fontSize: "0.72rem", 
                  fontWeight: "800", 
                  letterSpacing: "0.06em", 
                  color: accentColor,
                  textTransform: "uppercase"
                }}>
                  {isCritical ? "🚨 CRITICAL REGULATION DETECTED" : isHigh ? "⚡ HIGH-PRIORITY DIRECTIVE" : "📡 REGULATORY NOTICE"}
                </span>
                <span className={`badge ${isCritical ? "badge-critical" : isHigh ? "badge-high" : "badge-medium"}`} style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                  {alert.severity}
                </span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{flag}</span>
                <span style={{ fontWeight: "600", color: "#38bdf8" }}>{alert.board_name}</span>
                <span>•</span>
                <span>{alert.category || "General"}</span>
              </div>
            </div>
          </div>

          <button 
            id="btn-dismiss-alert-toast"
            className="btn btn-secondary btn-icon" 
            style={{ width: "26px", height: "26px", flexShrink: 0 }} 
            onClick={onDismiss}
            title="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <div style={{ 
          fontSize: "0.95rem", 
          fontWeight: "700", 
          color: "#ffffff", 
          lineHeight: 1.4, 
          marginBottom: "8px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}>
          {alert.title}
        </div>

        {/* Summary Snippet if available */}
        {alert.summary && (
          <p style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            lineHeight: 1.45,
            marginBottom: "14px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {alert.summary}
          </p>
        )}

        {/* Footer Actions */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)"
        }}>
          {queueCount > 1 ? (
            <button
              onClick={onOpenAlertCenter}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius-full)",
                padding: "4px 10px",
                fontSize: "0.72rem",
                color: "var(--neon-cyan)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Bell size={12} />
              <span>+{queueCount - 1} more in queue</span>
            </button>
          ) : onOpenAlertCenter ? (
            <button
              onClick={onOpenAlertCenter}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "0.72rem",
                color: "var(--text-dim)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "var(--neon-cyan)"}
              onMouseOut={(e) => e.currentTarget.style.color = "var(--text-dim)"}
            >
              <Bell size={12} />
              <span>Open Alert Center</span>
            </button>
          ) : <div />}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              id="btn-toast-dismiss"
              className="btn btn-secondary" 
              style={{ padding: "5px 12px", fontSize: "0.76rem" }}
              onClick={onDismiss}
            >
              Dismiss
            </button>
            <button 
              id="btn-toast-inspect"
              className="btn btn-primary" 
              style={{ 
                padding: "5px 14px", 
                fontSize: "0.76rem",
                fontWeight: "700",
                boxShadow: `0 0 15px ${accentColor}44`
              }}
              onClick={() => {
                onViewDetails(alert);
                onDismiss();
              }}
            >
              <span>Inspect Directive</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
