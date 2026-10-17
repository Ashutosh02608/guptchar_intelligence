import React from "react";
import { TelemetryBar } from "../components/TelemetryBar";
import { BoardsGrid } from "../components/BoardsGrid";
import { UpdatesFeed } from "../components/UpdatesFeed";
import { ArrowRight, Activity, ShieldCheck, Wifi } from "lucide-react";

export function CommandCenterPage({ 
  stats, 
  boards, 
  updates, 
  uptime,
  onToggleBoard, 
  onSelectUpdate, 
  onMarkRead, 
  onMarkAllRead, 
  onResetFeed,
  onNavigateToTab 
}) {
  return (
    <div>
      {/* 24*7 Surveillance Telemetry Bar */}
      <TelemetryBar stats={stats} boards={boards} uptime={uptime} />

      {/* Grid of Monitored Authorities */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
            <Wifi size={18} color="var(--neon-emerald)" />
            SURVEILLANCE RADAR: REGULATORY BOARDS
          </h2>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            onClick={() => onNavigateToTab("boards")}
          >
            <span>Manage Boards ({boards.length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <BoardsGrid boards={boards} onToggleBoard={onToggleBoard} />
      </div>

      {/* Live Stream of Filterable Circulars & Notifications */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} color="var(--neon-cyan)" />
            LIVE REGULATORY STREAM
          </h2>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            onClick={() => onNavigateToTab("updates")}
          >
            <span>Full Updates View</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <UpdatesFeed 
          updates={updates} 
          onSelectUpdate={onSelectUpdate}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onResetFeed={onResetFeed}
        />
      </div>
    </div>
  );
}


