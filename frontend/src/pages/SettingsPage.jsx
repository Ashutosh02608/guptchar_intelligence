import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ShieldCheck, 
  HelpCircle, 
  Bell, 
  ExternalLink, 
  Check,
  Mail,
  Key
} from "lucide-react";
import { sound } from "../utils/audio";

const API_BASE = "http://127.0.0.1:8000";

export function SettingsPage({ isMuted, onToggleMute, onResetFeed }) {
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [smtpStatus, setSmtpStatus] = useState(null);

  const fetchSmtpStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/smtp/status`);
      const data = await res.json();
      setSmtpStatus(data);
    } catch (e) {
      console.error("Failed to load SMTP status", e);
    }
  };

  useEffect(() => {
    fetchSmtpStatus();
  }, []);

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      await onResetFeed();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Page Title */}
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sliders size={22} color="var(--neon-emerald)" />
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              REGULATORY SURVEILLANCE SETTINGS
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
              Configure 10-second polling behavior, audio alert triggers, and watermark baseline controls
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        
        {/* Section 1: Audio & Alert Notification */}
        <div className="glass-panel" style={{ padding: "22px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Bell size={18} color="var(--neon-cyan)" />
            Instant Audio & Alert Synthesis
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
            Synthesized audio tones generated via the HTML5 Web Audio API directly in your browser. When newly published regulations (such as critical circulars or trading halts) are detected during the 10-second sweep, the alert chime sounds immediately.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0, 0, 0, 0.25)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "#ffffff" }}>
                Audio Surveillance Alarm
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                {isMuted ? "Audio is currently MUTED" : "Audio is currently ACTIVE (Alarm sounds on critical releases)"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className={isMuted ? "btn btn-primary" : "btn btn-secondary"}
                onClick={onToggleMute}
              >
                {isMuted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span>{isMuted ? "Unmute Alarm" : "Mute Alarm"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Watermark Baseline Management */}
        <div className="glass-panel" style={{ padding: "22px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <RotateCcw size={18} color="var(--neon-amber)" />
            Watermark Baseline Management
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
            The system takes an immutable cryptographic SHA-256 snapshot of all existing announcements on SEBI, RBI, US SEC, UK FCA, and ESMA. Only brand new releases published after this moment will trigger alerts. If you wish to wipe the feed and re-synchronize the baseline to the current second, use this tool.
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0, 0, 0, 0.25)", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div>
              <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "#ffffff" }}>
                Re-establish Watermark Baseline
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Wipes old update cards from memory and resets the baseline watermark to right now.
              </div>
            </div>

            <button
              id="btn-settings-reset-watermark"
              className={resetSuccess ? "btn btn-primary" : "btn btn-secondary"}
              onClick={handleExecuteReset}
              disabled={isResetting}
            >
              {resetSuccess ? <Check size={15} /> : <RotateCcw size={15} />}
              <span>{resetSuccess ? "Baseline Reset!" : "Reset Watermark"}</span>
            </button>
          </div>
        </div>

        {/* Section 3: SMTP Mail Dispatch Server Configuration & Diagnostics */}
        <div className="glass-panel" style={{ padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Mail size={18} color="var(--neon-cyan)" />
              SMTP Regulatory Advisory Dispatcher
            </h3>
            <span className={`badge ${smtpStatus?.configured ? "badge-healthy" : "badge-warning"}`} style={{ fontSize: "0.72rem" }}>
              {smtpStatus?.configured ? "● LIVE SMTP ACTIVE" : "⚡ SIMULATED / DRY-RUN"}
            </span>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
            Automated intelligence summaries and executive advisories approved by human reviewers are dispatched via this SMTP transport relay. Supports Gmail, Brevo, SendGrid, Amazon SES, or custom corporate relays.
          </p>

          {/* Current Configuration Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "18px" }}>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>SMTP HOST</div>
              <div className="mono" style={{ fontSize: "0.88rem", fontWeight: "600", color: "#ffffff", marginTop: "2px" }}>
                {smtpStatus?.host || "smtp.gmail.com"}
              </div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>PORT & SECURITY</div>
              <div className="mono" style={{ fontSize: "0.88rem", fontWeight: "600", color: "#ffffff", marginTop: "2px" }}>
                {smtpStatus?.port || 587} • {smtpStatus?.security || "STARTTLS"}
              </div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>AUTHENTICATED SENDER</div>
              <div className="mono" style={{ fontSize: "0.88rem", fontWeight: "600", color: "#ffffff", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {smtpStatus?.user || "(configure .env)"}
              </div>
            </div>
          </div>


          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Key size={13} color="var(--neon-cyan)" />
            <span>To use Gmail SMTP: Generate an <strong>App Password</strong> in Google Account Security and configure <code>SMTP_USER</code> and <code>SMTP_PASSWORD</code> in <code>.env</code>.</span>
          </div>
        </div>

        {/* Section 3: Surveillance Cadence Specifications */}
        <div className="glass-panel" style={{ padding: "22px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <ShieldCheck size={18} color="var(--neon-emerald)" />
            10-Second Surveillance Architecture
          </h3>
          <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: "10px" }}>
            <p>
              • <strong>10-Second Polling Loop:</strong> The backend monitoring daemon runs an asynchronous event loop that executes concurrent HTTP sweeps across all enabled regulatory boards every 10 seconds.
            </p>
            <p>
              • <strong>Rate-Limit & ETag Protection:</strong> Probes utilize non-blocking connection pools, gzip compression, and genuine browser headers to prevent gateway throttling.
            </p>
            <p>
              • <strong>Real-Time WebSocket Synchronization:</strong> All connected dashboards receive sub-second heartbeat ticks, continuous 24*7 uptime telemetry, and instant alert payloads with zero page refresh required.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
