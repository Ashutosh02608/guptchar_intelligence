import React, { useState, useEffect } from "react";
import { 
  X, 
  Send, 
  CheckCircle, 
  XCircle, 
  Building, 
  FileText, 
  ShieldAlert, 
  Mail, 
  MapPin, 
  Globe, 
  Phone, 
  UserCheck, 
  ExternalLink,
  Edit3
} from "lucide-react";

export function DispatchReviewModal({
  dispatch,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onUpdate
}) {
  if (!isOpen || !dispatch) return null;

  const [recipient, setRecipient] = useState(dispatch.recipient_email || "");
  const [subject, setSubject] = useState(dispatch.email_subject || "");
  const [body, setBody] = useState(dispatch.email_body || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dispatch) {
      setRecipient(dispatch.recipient_email || "");
      setSubject(dispatch.email_subject || "");
      setBody(dispatch.email_body || "");
      setIsEditing(false);
    }
  }, [dispatch]);

  // Parse executives and SEC filings if stored as JSON
  let executives = [];
  try {
    if (dispatch.executives_info) {
      executives = JSON.parse(dispatch.executives_info);
    }
  } catch (e) {}

  let secFilings = [];
  try {
    if (dispatch.sec_filing_info) {
      secFilings = JSON.parse(dispatch.sec_filing_info);
    }
  } catch (e) {}

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await onUpdate(dispatch.id, {
      recipient_email: recipient,
      email_subject: subject,
      email_body: body
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleApprove = async () => {
    await onApprove(dispatch.id);
    onClose();
  };

  const handleReject = async () => {
    await onReject(dispatch.id);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.78)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "10px"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "1020px",
        maxHeight: "94vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        background: "rgba(11, 17, 33, 0.94)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
        overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <Mail style={{ color: "var(--neon-cyan)", width: "18px", height: "18px" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                  Human Review: {dispatch.company_name}
                </h3>
                <span className={`badge badge-${dispatch.severity.toLowerCase()}`}>
                  {dispatch.severity}
                </span>
                <span className="badge" style={{
                  background: dispatch.status === "SENT" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  color: dispatch.status === "SENT" ? "var(--neon-emerald)" : "var(--neon-amber)",
                  border: `1px solid ${dispatch.status === "SENT" ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`
                }}>
                  {dispatch.status.replace("_", " ")}
                </span>
                {dispatch.is_subscribed || dispatch.template_type === "SUBSCRIBED_VIP" ? (
                  <span className="badge" style={{
                    background: "rgba(16, 185, 129, 0.18)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    fontSize: "0.68rem",
                    fontWeight: "600"
                  }}>
                    👑 VIP SUBSCRIBER
                  </span>
                ) : (
                  <span className="badge" style={{
                    background: "rgba(168, 85, 247, 0.18)",
                    color: "#c084fc",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    fontSize: "0.68rem",
                    fontWeight: "600"
                  }}>
                    ⚡ PROSPECT EARLY-WARNING
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
                Sector: {dispatch.sector} • Hub: {dispatch.region} • Template: {dispatch.is_subscribed || dispatch.template_type === "SUBSCRIBED_VIP" ? "Subscriber Confidential Advisory" : "Unsubscribed Conversion Dispatch"}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: "transparent", border: "none", color: "var(--text-dim)",
              cursor: "pointer", padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body - Responsive Split Grid */}
        <div 
          className="modal-split-layout"
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            flex: 1
          }}
        >
          {/* Left Column: Context & Intelligence */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Regulatory Trigger Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "14px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <ShieldAlert size={15} style={{ color: "var(--neon-amber)" }} />
                <span style={{ fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", color: "var(--neon-amber)" }}>
                  Triggering Regulatory Mandate
                </span>
              </div>
              <h4 style={{ fontSize: "0.88rem", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>
                {dispatch.announcement_title}
              </h4>
              <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                Issuing Board: <strong style={{ color: "#fff" }}>{dispatch.board_name}</strong>
              </p>
              {dispatch.risk_summary && (
                <div style={{
                  fontSize: "0.74rem",
                  color: "var(--text-main)",
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  borderLeft: "3px solid var(--neon-cyan)"
                }}>
                  {dispatch.risk_summary}
                </div>
              )}
            </div>

            {/* Target Company Intelligence Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "14px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <Building size={15} style={{ color: "var(--neon-cyan)" }} />
                <span style={{ fontSize: "0.74rem", fontWeight: "700", textTransform: "uppercase", color: "var(--neon-cyan)" }}>
                  Discovered Company Dossier
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.78rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)" }}>Entity:</span>
                  <strong style={{ color: "#fff" }}>{dispatch.company_name}</strong>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <MapPin size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)" }}>Hub Region:</span>
                  <span style={{ color: "#fff" }}>{dispatch.region}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Mail size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                  <span style={{ color: "var(--text-muted)" }}>Target Email:</span>
                  <span style={{ color: "var(--neon-cyan)", fontWeight: "600" }}>{dispatch.recipient_email}</span>
                </div>
              </div>

              {/* Leadership List */}
              {executives.length > 0 && (
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: "600", textTransform: "uppercase" }}>
                      Leadership & Officers ({executives.length})
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--neon-cyan)" }}>
                      Founders • CEOs • MDs
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    {executives.slice(0, 4).map((ex, i) => {
                      const tLow = (ex.title || "").toLowerCase();
                      let roleLabel = "OFFICER";
                      let roleColor = "var(--text-muted)";
                      let roleBg = "rgba(255, 255, 255, 0.05)";
                      if (tLow.includes("founder")) {
                        roleLabel = "FOUNDER";
                        roleColor = "var(--neon-cyan)";
                        roleBg = "rgba(6, 182, 212, 0.15)";
                      } else if (tLow.includes("ceo") || tLow.includes("chief executive")) {
                        roleLabel = "CEO";
                        roleColor = "var(--neon-emerald)";
                        roleBg = "rgba(16, 185, 129, 0.15)";
                      } else if (tLow.includes("managing director") || tLow.trim() === "md" || tLow.includes("partner")) {
                        roleLabel = "MD";
                        roleColor = "var(--neon-amber)";
                        roleBg = "rgba(245, 158, 11, 0.15)";
                      }

                      return (
                        <div key={i} style={{ 
                          fontSize: "0.74rem", 
                          background: "rgba(0, 0, 0, 0.25)", 
                          padding: "6px 8px", 
                          borderRadius: "4px",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#fff", fontWeight: "600" }}>{ex.name}</span>
                            <span className="badge" style={{ background: roleBg, color: roleColor, fontSize: "0.6rem", padding: "1px 5px" }}>
                              {roleLabel}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            <span>{ex.title}</span>
                            {ex.email && ex.email !== "N/A" && (
                              <span style={{ color: "var(--neon-cyan)" }}>{ex.email}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Email Editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.76rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                AI-Generated Compliance Email Draft
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: isEditing ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: isEditing ? "var(--neon-cyan)" : "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <Edit3 size={13} />
                <span>{isEditing ? "Done Editing" : "Edit Draft"}</span>
              </button>
            </div>

            {/* Recipient Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Recipient Address
              </label>
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={!isEditing}
                style={{
                  background: isEditing ? "rgba(2, 6, 23, 0.8)" : "rgba(0, 0, 0, 0.4)",
                  border: isEditing ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  color: "#fff",
                  outline: "none"
                }}
              />
            </div>

            {/* Subject Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!isEditing}
                style={{
                  background: isEditing ? "rgba(2, 6, 23, 0.8)" : "rgba(0, 0, 0, 0.4)",
                  border: isEditing ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  color: "#fff",
                  fontWeight: "600",
                  outline: "none"
                }}
              />
            </div>

            {/* Body Textarea */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
              <label style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Email Content
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!isEditing}
                rows={14}
                style={{
                  background: isEditing ? "rgba(2, 6, 23, 0.8)" : "rgba(0, 0, 0, 0.4)",
                  border: isEditing ? "1px solid var(--neon-cyan)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "0.78rem",
                  fontFamily: "monospace",
                  lineHeight: "1.45",
                  color: "var(--text-main)",
                  outline: "none",
                  resize: "vertical"
                }}
              />
            </div>

            {isEditing && (
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                style={{
                  background: "rgba(6, 182, 212, 0.2)",
                  border: "1px solid var(--neon-cyan)",
                  color: "var(--neon-cyan)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  alignSelf: "flex-end"
                }}
              >
                {isSaving ? "Saving..." : "Save Draft Changes"}
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(0, 0, 0, 0.35)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleReject}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#f87171",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <XCircle size={15} />
              <span>Reject / Discard</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-muted)",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                cursor: "pointer"
              }}
            >
              Close
            </button>

            <button
              onClick={handleApprove}
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                border: "none",
                color: "#fff",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.3)"
              }}
            >
              <CheckCircle size={16} />
              <span>Approve & Send Email Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
