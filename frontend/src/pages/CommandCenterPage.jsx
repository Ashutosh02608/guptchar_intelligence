import React from "react";
import { TelemetryBar } from "../components/TelemetryBar";
import { BoardsGrid } from "../components/BoardsGrid";
import { UpdatesFeed } from "../components/UpdatesFeed";
import { ArrowRight, Wifi } from "lucide-react";

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

      {/* 3:7 Split Grid: Left = Regulatory Boards (30%), Right = Live Circulars (70%) */}
      <div className="command-center-split">
        {/* Left Column (30% / 3fr): Monitored Regulatory Boards */}
        <div className="command-center-col glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Wifi size={17} color="var(--neon-emerald)" />
              <h2 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                REGULATORY BOARDS
              </h2>
              <span className="badge badge-healthy" style={{ fontSize: "0.62rem", padding: "1px 6px" }}>
                {boards.length}
              </span>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: "0.76rem", padding: "4px 10px" }}
              onClick={() => onNavigateToTab("boards")}
              title="Manage all watchlist boards"
            >
              <span>Manage</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Boards List Scrollable Body (Equal Height to Right Panel) */}
          <div className="command-center-scroll-body sidebar-scroll-area" style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
            <BoardsGrid boards={boards} onToggleBoard={onToggleBoard} hideHeader={true} />
          </div>
        </div>

        {/* Right Column (70% / 7fr): Live Regulatory Stream & Circulars */}
        <div className="command-center-col" style={{ minWidth: 0 }}>
          <UpdatesFeed 
            updates={updates} 
            onSelectUpdate={onSelectUpdate}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onResetFeed={onResetFeed}
            onNavigateToFullView={() => onNavigateToTab("updates")}
            isEmbedded={true}
          />
        </div>
      </div>
    </div>
  );
}


