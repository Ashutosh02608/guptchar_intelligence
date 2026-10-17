import React from "react";
import { UpdatesFeed } from "../components/UpdatesFeed";
import { FileText, Download, CheckCheck, SlidersHorizontal, ShieldAlert } from "lucide-react";

export function UpdatesPage({ 
  updates, 
  onSelectUpdate, 
  onMarkRead, 
  onMarkAllRead, 
  onResetFeed 
}) {
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(updates, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `guptchar_updates_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const unreadCount = updates.filter(u => !u.is_read).length;

  return (
    <div>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FileText size={22} color="var(--neon-cyan)" />
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                REGULATORY CIRCULARS & DIRECTIVES FEED
              </h2>
              {unreadCount > 0 && (
                <span className="badge badge-critical">
                  {unreadCount} NEW UNREAD
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
              Chronological log of newly published releases detected across SEBI, RBI, US SEC, UK FCA, and ESMA
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              onClick={handleExportJSON}
              title="Download updates data as JSON"
            >
              <Download size={14} />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Updates Feed Component */}
      <UpdatesFeed
        updates={updates}
        onSelectUpdate={onSelectUpdate}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onResetFeed={onResetFeed}
      />
    </div>
  );
}

