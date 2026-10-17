import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, Clock, FileText, Cpu, AlertTriangle } from "lucide-react";

export function TelemetryBar({ stats, boards, uptime }) {
  const [liveUptime, setLiveUptime] = useState(() => (typeof uptime === "number" && uptime > 0) ? uptime : (stats?.uptime_seconds || 0));

  // Sync with incoming uptime prop or stats
  useEffect(() => {
    const target = (typeof uptime === "number" && uptime > 0) ? uptime : stats?.uptime_seconds;
    if (typeof target === "number" && target >= 0) {
      setLiveUptime(prev => {
        if (Math.abs(prev - target) >= 2) {
          return Math.floor(target);
        }
        return prev;
      });
    }
  }, [uptime, stats?.uptime_seconds]);

  // Continuous 1-second real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveUptime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return "00:00:00";
    const sec = Math.floor(seconds);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (d > 0) {
      return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Calculate average latency
  const activeBoardsWithLatency = (boards || []).filter(b => b.enabled && b.last_latency_ms);
  const avgLatency = activeBoardsWithLatency.length > 0
    ? Math.round(activeBoardsWithLatency.reduce((acc, b) => acc + b.last_latency_ms, 0) / activeBoardsWithLatency.length)
    : 0;

  const totalErrors = (boards || []).reduce((acc, b) => acc + (b.error_count || 0), 0);

  const metrics = [
    {
      label: "24*7 UPTIME",
      value: formatUptime(liveUptime),
      subtext: "Continuous Surveillance",
      icon: Clock,
      color: "var(--neon-emerald)",
      mono: true
    },
    {
      label: "TOTAL SWEEPS",
      value: (stats?.total_checks || 0).toLocaleString(),
      subtext: "10s Polling Iterations",
      icon: Activity,
      color: "var(--neon-cyan)",
      mono: true
    },
    {
      label: "REGULATORS ACTIVE",
      value: `${stats?.active_boards_count || 0} / ${stats?.monitored_boards_count || 0}`,
      subtext: "SEBI • RBI • SEC • FCA • ESMA",
      icon: ShieldCheck,
      color: "var(--neon-emerald)",
      mono: false
    },
    {
      label: "CIRCULARS CAPTURED",
      value: (stats?.total_updates_detected || 0).toLocaleString(),
      subtext: "Indexed & Diff Analyzed",
      icon: FileText,
      color: "#a855f7",
      mono: true
    },
    {
      label: "AVG NETWORK LATENCY",
      value: avgLatency ? `${avgLatency} ms` : "Calculating...",
      subtext: totalErrors > 0 ? `${totalErrors} gateway anomalies` : "Optimal Packet Route",
      icon: totalErrors > 0 ? AlertTriangle : Cpu,
      color: totalErrors > 0 ? "var(--neon-amber)" : "var(--neon-cyan)",
      mono: true
    }
  ];

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", 
      gap: "14px", 
      marginBottom: "20px" 
    }}>
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <div 
            key={idx} 
            className="glass-panel" 
            style={{ 
              padding: "16px 18px", 
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Ambient edge glow */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`
            }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                {m.label}
              </span>
              <IconComponent size={16} color={m.color} />
            </div>

            <div className={m.mono ? "mono" : ""} style={{ fontSize: "1.45rem", fontWeight: "700", color: "#ffffff", marginBottom: "2px" }}>
              {m.value}
            </div>

            <div style={{ fontSize: "0.73rem", color: "var(--text-dim)" }}>
              {m.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
