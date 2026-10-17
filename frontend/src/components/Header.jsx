import React from "react";
import { 
  ShieldAlert, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  PlusCircle, 
  Radio
} from "lucide-react";

export function Header({ 
  isSweeping, 
  onForceSweep, 
  onOpenAddBoard, 
  isMuted, 
  onToggleMute 
}) {

  return (
    <header className="glass-panel" style={{ padding: "16px 24px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        
        {/* Brand & Surveillance Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ 
            width: "44px", 
            height: "44px", 
            borderRadius: "12px", 
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.25)"
          }}>
            <Radio className="animate-pulse-slow" style={{ color: "var(--neon-emerald)", width: "24px", height: "24px" }} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#ffffff", letterSpacing: "0.02em" }}>
                GUPTCHAR
              </h1>
              <span className="badge badge-healthy" style={{ fontSize: "0.68rem", padding: "2px 8px" }}>
                24*7 LIVE
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Autonomous Financial Regulatory Surveillance Engine
            </p>
          </div>
        </div>



        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Mute/Unmute Audio */}
          <button 
            id="btn-toggle-sound"
            className="btn btn-secondary btn-icon" 
            onClick={onToggleMute}
            title={isMuted ? "Unmute Sound Alerts" : "Mute Sound Alerts"}
          >
            {isMuted ? <VolumeX size={18} color="var(--text-dim)" /> : <Volume2 size={18} color="var(--neon-cyan)" />}
          </button>

          {/* Force Sweep Button */}
          <button 
            id="btn-force-sweep"
            className="btn btn-secondary" 
            onClick={onForceSweep}
            disabled={isSweeping}
            title="Trigger immediate regulatory scan cycle"
          >
            <RotateCw size={15} className={isSweeping ? "animate-radar" : ""} />
            <span>Force Sweep</span>
          </button>

          {/* Add Board */}
          <button 
            id="btn-add-board"
            className="btn btn-secondary" 
            onClick={onOpenAddBoard}
          >
            <PlusCircle size={15} />
            <span>Add Board</span>
          </button>
        </div>

      </div>
    </header>
  );
}
