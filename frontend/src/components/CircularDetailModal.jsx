import React, { useState } from "react";
import { X, ExternalLink, ShieldCheck, Hash, Calendar, FileText, CheckCircle2, Zap, Check, Timer } from "lucide-react";
import { API_BASE } from "../utils/config";
import { calculateDeadlineInfo } from "../utils/deadlineTracker";

export function CircularDetailModal({ item, onClose, onNavigateToOutbox }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState("");

  if (!item) return null;

  const isCritical = item.severity === "CRITICAL";
  const isHigh = item.severity === "HIGH";
  const deadlineInfo = calculateDeadlineInfo(item);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ 
          padding: "20px 24px", 
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
          display: "flex", 
          alignItems: "flex-start", 
          justifyContent: "space-between",
          gap: "14px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span className={`badge ${
                isCritical ? "badge-critical" : isHigh ? "badge-high" : "badge-medium"
              }`}>
                {item.severity}
              </span>
              <span className="mono" style={{ fontSize: "0.82rem", fontWeight: "700", color: "#38bdf8" }}>
                {item.jurisdiction} • {item.board_name}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                {item.category}
              </span>
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", lineHeight: 1.4 }}>
              {item.title}
            </h3>
          </div>

          <button 
            className="btn btn-secondary btn-icon" 
            style={{ width: "30px", height: "30px", flexShrink: 0 }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Executive Summary */}
          <div>
            <h4 style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Summary & Directive Details
            </h4>
            <div style={{ 
              background: "rgba(0, 0, 0, 0.35)", 
              padding: "14px 16px", 
              borderRadius: "var(--radius-md)", 
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              color: "#e2e8f0"
            }}>
              {item.summary || "No automated summary provided by authority."}
            </div>
          </div>

          {/* Compliance Deadline & Enforcement Radar */}
          {deadlineInfo && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Timer size={14} color="var(--neon-cyan)" />
                  <span>Compliance Deadline Radar</span>
                </h4>
                <span 
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: "700",
                    color: deadlineInfo.tierColor,
                    background: deadlineInfo.urgencyTier === "IMMEDIATE" || deadlineInfo.isOverdue
                      ? "rgba(239, 68, 68, 0.2)"
                      : deadlineInfo.urgencyTier === "APPROACHING"
                      ? "rgba(245, 158, 11, 0.16)"
                      : "rgba(16, 185, 129, 0.14)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: `1px solid ${deadlineInfo.tierColor}55`
                  }}
                >
                  {deadlineInfo.urgencyLabel}
                </span>
              </div>

              <div style={{
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(11, 17, 30, 0.95) 100%)",
                border: `1px solid ${deadlineInfo.urgencyTier === "IMMEDIATE" || deadlineInfo.isOverdue ? "rgba(239, 68, 68, 0.45)" : "rgba(6, 182, 212, 0.25)"}`,
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                boxShadow: deadlineInfo.urgencyTier === "IMMEDIATE" || deadlineInfo.isOverdue ? "0 0 18px rgba(239, 68, 68, 0.15)" : "none"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Target Enforcement Date
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={16} color="var(--neon-cyan)" />
                      <span>{deadlineInfo.formattedDate}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--neon-cyan)", marginTop: "2px", fontWeight: "500" }}>
                      {deadlineInfo.stageTitle}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Compliance Countdown
                    </div>
                    <div style={{
                      fontSize: "1.2rem",
                      fontWeight: "800",
                      fontFamily: "var(--font-mono)",
                      color: deadlineInfo.tierColor,
                      marginTop: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "6px"
                    }}>
                      <Timer size={18} />
                      <span>{deadlineInfo.countdownText}</span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {deadlineInfo.isOverdue ? "Mandatory cutoff elapsed" : "Grace window active"}
                    </div>
                  </div>
                </div>

                {/* Transition Window Progress Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "4px" }}>
                    <span>Announcement Detected</span>
                    <span>Transition Window: {deadlineInfo.progressPercent}% elapsed</span>
                    <span>Enforcement Cutoff</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div 
                      style={{ 
                        width: `${deadlineInfo.progressPercent || 0}%`, 
                        height: "100%", 
                        background: deadlineInfo.urgencyTier === "IMMEDIATE" || deadlineInfo.isOverdue
                          ? "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"
                          : "linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-emerald) 100%)",
                        transition: "width 0.4s ease"
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Official Document Link & Authority Verification */}
          <div>
            <h4 style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Official Authority Source
            </h4>
            <div style={{ 
              background: "rgba(6, 182, 212, 0.05)", 
              border: "1px solid rgba(6, 182, 212, 0.2)",
              padding: "12px 16px", 
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--neon-cyan)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                  Verified release from <strong>{item.board_name}</strong> portal. Direct link to government publication.
                </div>
              </div>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "0.75rem", whiteSpace: "nowrap" }}
              >
                <ExternalLink size={12} />
                <span>Verify on Gov Site</span>
              </a>
            </div>
          </div>

          {/* Audit Verification */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", 
            gap: "10px", 
            fontSize: "0.74rem", 
            color: "var(--text-muted)",
            background: "rgba(255, 255, 255, 0.02)",
            padding: "12px",
            borderRadius: "var(--radius-sm)"
          }}>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block" }}>Publication Timestamp:</span>
              <span style={{ color: "#ffffff", fontWeight: "500" }}>{item.published_date || "Continuous Listing"}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block" }}>Capture Timestamp:</span>
              <span style={{ color: "#ffffff", fontWeight: "500" }}>
                {new Date(item.detected_at * 1000).toLocaleTimeString()} ({new Date(item.detected_at * 1000).toLocaleDateString()})
              </span>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "var(--text-dim)", display: "block" }}>SHA-256 Content Fingerprint:</span>
              <span className="mono" style={{ color: "var(--neon-cyan)", wordBreak: "break-all", fontSize: "0.7rem" }}>
                {item.content_hash}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          {notice && (
            <div style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "var(--neon-emerald)",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <Check size={14} />
              <span>{notice}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Authority: {item.board_name} ({item.jurisdiction})
            </span>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="btn"
                disabled={isProcessing}
                onClick={async () => {
                  setIsProcessing(true);
                  try {
                    await fetch(`${API_BASE}/api/intelligence/evaluate-announcement/${item.id}`, { method: "POST" });
                    setNotice("AI Risk Evaluation launched! Extractor is finding companies and queuing Outbox emails.");
                    setTimeout(() => setNotice(""), 6000);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)",
                  border: "1px solid rgba(6, 182, 212, 0.4)",
                  color: "var(--neon-cyan)",
                  fontSize: "0.76rem"
                }}
              >
                <Zap size={14} />
                <span>{isProcessing ? "Analyzing..." : "Trigger AI Extractor & Outbox"}</span>
              </button>

              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary"
              >
                <ExternalLink size={15} />
                <span>Open Source Document</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
