import React, { useState } from "react";
import { 
  Mail, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Building, 
  ExternalLink, 
  Trash2, 
  CheckCheck, 
  AlertTriangle,
  RotateCw,
  Eye,
  Edit2
} from "lucide-react";
import { DispatchReviewModal } from "../components/DispatchReviewModal";

export function OutboxPage({
  outbox = [],
  outboxCounts = { total: 0, pending: 0, sent: 0, rejected: 0 },
  onApproveDispatch,
  onRejectDispatch,
  onUpdateDispatch,
  onBatchSend,
  onDeleteDispatch,
  onClearOutbox,
  onRefresh
}) {
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW"); // ALL, PENDING_REVIEW, SENT, REJECTED
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  // Filter items
  const filteredDispatches = outbox.filter(d => {
    // Status filter
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    // Severity filter
    if (severityFilter !== "ALL" && d.severity !== severityFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = (d.company_name || "").toLowerCase().includes(q);
      const matchSub = (d.email_subject || "").toLowerCase().includes(q);
      const matchAnn = (d.announcement_title || "").toLowerCase().includes(q);
      const matchSec = (d.sector || "").toLowerCase().includes(q);
      if (!matchComp && !matchSub && !matchAnn && !matchSec) return false;
    }
    return true;
  });

  const pendingCount = outbox.filter(d => d.status === "PENDING_REVIEW").length;
  const sentCount = outbox.filter(d => d.status === "SENT").length;
  const rejectedCount = outbox.filter(d => d.status === "REJECTED").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header Banner & Stats */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "8px",
                background: "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Mail style={{ color: "var(--neon-cyan)", width: "18px", height: "18px" }} />
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#fff", margin: 0 }}>
                Regulatory Outbox & AI Email Dispatches
              </h2>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 46px" }}>
              Automated Impacted Company Extraction, Deduplication & Human-in-the-Loop Advisory Email Queue
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {pendingCount > 0 && (
              <button
                onClick={onBatchSend}
                style={{
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  border: "none",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 0 16px rgba(16, 185, 129, 0.25)"
                }}
              >
                <CheckCheck size={16} />
                <span className="hide-mobile">Approve & Send All Pending ({pendingCount})</span>
                <span className="show-mobile hide-desktop">Approve All ({pendingCount})</span>
              </button>
            )}

            {outbox.length > 0 && (
              <button
                onClick={onClearOutbox}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "var(--text-dim)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.76rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
          gap: "14px"
        }}>
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(245, 158, 11, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Clock style={{ color: "var(--neon-amber)", width: "18px", height: "18px" }} />
            </div>
            <div>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff" }}>
                {pendingCount}
              </span>
              <p style={{ fontSize: "0.72rem", color: "var(--neon-amber)", margin: 0, fontWeight: "600" }}>
                Awaiting Human Review
              </p>
            </div>
          </div>

          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <CheckCircle style={{ color: "var(--neon-emerald)", width: "18px", height: "18px" }} />
            </div>
            <div>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff" }}>
                {sentCount}
              </span>
              <p style={{ fontSize: "0.72rem", color: "var(--neon-emerald)", margin: 0, fontWeight: "600" }}>
                Approved & Dispatched
              </p>
            </div>
          </div>

          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Building style={{ color: "var(--neon-cyan)", width: "18px", height: "18px" }} />
            </div>
            <div>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff" }}>
                {outbox.length}
              </span>
              <p style={{ fontSize: "0.72rem", color: "var(--neon-cyan)", margin: 0, fontWeight: "600" }}>
                Total Emails Formulated
              </p>
            </div>
          </div>

          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "10px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <XCircle style={{ color: "#f87171", width: "18px", height: "18px" }} />
            </div>
            <div>
              <span style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff" }}>
                {rejectedCount}
              </span>
              <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", margin: 0, fontWeight: "600" }}>
                Rejected / Discarded
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: "14px 20px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px"
        }}>
          {/* Status Tabs */}
          <div className="scroll-touch-x" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "PENDING_REVIEW", label: `Pending Review (${pendingCount})` },
              { id: "SENT", label: `Dispatched (${sentCount})` },
              { id: "REJECTED", label: `Rejected (${rejectedCount})` },
              { id: "ALL", label: `All (${outbox.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  background: statusFilter === tab.id ? "rgba(6, 182, 212, 0.2)" : "transparent",
                  border: statusFilter === tab.id ? "1px solid var(--neon-cyan)" : "1px solid transparent",
                  color: statusFilter === tab.id ? "#fff" : "var(--text-muted)",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  fontWeight: statusFilter === tab.id ? "600" : "500",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "6px",
              padding: "6px 12px",
              flex: "1 1 180px",
              minWidth: "min(100%, 180px)"
            }}>
              <Search size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search company, sector, circular..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "0.78rem",
                  width: "100%"
                }}
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "6px",
                padding: "6px 10px",
                color: "var(--text-main)",
                fontSize: "0.76rem",
                outline: "none"
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dispatches List */}
      {filteredDispatches.length === 0 ? (
        <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center" }}>
          <Mail size={42} style={{ color: "var(--text-dim)", margin: "0 auto 14px", opacity: 0.5 }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: "600", color: "#fff", marginBottom: "6px" }}>
            No Dispatches Found
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto" }}>
            {outbox.length === 0 
              ? "When new regulatory releases arrive, AI automatically analyzes sector risk, extracts impacted companies via the Extractor Engine, and queues tailored advisory emails here for human review."
              : "No emails matched your current filters. Try resetting the status or search query."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredDispatches.map((dispatch) => {
            const isPending = dispatch.status === "PENDING_REVIEW";
            const isSent = dispatch.status === "SENT";

            return (
              <div 
                key={dispatch.id}
                className="glass-panel"
                style={{
                  padding: "18px 22px",
                  borderLeft: isPending ? "4px solid var(--neon-amber)" : (isSent ? "4px solid var(--neon-emerald)" : "4px solid #64748b"),
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "10px"
                }}>
                  {/* Company & Sector Info */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "1.05rem", fontWeight: "700", color: "#fff" }}>
                        {dispatch.company_name}
                      </span>
                      <span className={`badge badge-${dispatch.severity.toLowerCase()}`}>
                        {dispatch.severity}
                      </span>
                      <span className="badge" style={{
                        background: "rgba(6, 182, 212, 0.15)",
                        color: "var(--neon-cyan)",
                        border: "1px solid rgba(6, 182, 212, 0.3)"
                      }}>
                        {dispatch.sector}
                      </span>
                      {dispatch.is_subscribed || dispatch.template_type === "SUBSCRIBED_VIP" ? (
                        <span className="badge" style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.35)",
                          fontSize: "0.68rem"
                        }}>
                          👑 VIP CLIENT
                        </span>
                      ) : (
                        <span className="badge" style={{
                          background: "rgba(168, 85, 247, 0.15)",
                          color: "#c084fc",
                          border: "1px solid rgba(168, 85, 247, 0.35)",
                          fontSize: "0.68rem"
                        }}>
                          ⚡ PROSPECT
                        </span>
                      )}
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                        Hub: {dispatch.region}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", fontSize: "0.78rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Target Recipient:</span>
                      <span style={{ color: "var(--neon-cyan)", fontWeight: "600" }}>{dispatch.recipient_email}</span>
                    </div>
                  </div>

                  {/* Status Badge & Review Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="badge" style={{
                      background: isSent ? "rgba(16, 185, 129, 0.2)" : (isPending ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)"),
                      color: isSent ? "var(--neon-emerald)" : (isPending ? "var(--neon-amber)" : "#f87171"),
                      border: `1px solid ${isSent ? "rgba(16, 185, 129, 0.4)" : (isPending ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.4)")}`,
                      fontSize: "0.7rem",
                      padding: "3px 9px"
                    }}>
                      {dispatch.status.replace("_", " ")}
                    </span>

                    {/* Review Modal Trigger */}
                    <button
                      onClick={() => setSelectedDispatch(dispatch)}
                      style={{
                        background: "rgba(6, 182, 212, 0.15)",
                        border: "1px solid rgba(6, 182, 212, 0.35)",
                        color: "var(--neon-cyan)",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.76rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Eye size={13} />
                      <span>Review / Edit</span>
                    </button>

                    {isPending && (
                      <button
                        onClick={() => onApproveDispatch(dispatch.id)}
                        style={{
                          background: "linear-gradient(135deg, #059669, #10b981)",
                          border: "none",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "0.76rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        <Send size={13} />
                        <span>Send</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteDispatch(dispatch.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-dim)",
                        cursor: "pointer",
                        padding: "6px"
                      }}
                      title="Delete Dispatch"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Regulatory Trigger Synopsis */}
                <div style={{
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "10px",
                  fontSize: "0.76rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ color: "var(--text-dim)", fontWeight: "600" }}>REGULATORY MANDATE:</span>
                    <strong style={{ color: "#fff" }}>{dispatch.board_name}</strong>
                    <span>—</span>
                    <span style={{ color: "var(--text-main)" }}>{dispatch.announcement_title}</span>
                  </div>
                  {dispatch.risk_summary && (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.74rem", marginTop: "2px" }}>
                      <i>AI Evaluation:</i> {dispatch.risk_summary}
                    </div>
                  )}
                </div>

                {/* Email Subject Line */}
                <div style={{
                  fontSize: "0.78rem",
                  color: "#fff",
                  fontWeight: "600",
                  padding: "6px 10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <Mail size={13} style={{ color: "var(--neon-cyan)" }} />
                  <span>Subject: {dispatch.email_subject}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Edit Modal */}
      <DispatchReviewModal
        dispatch={selectedDispatch}
        isOpen={Boolean(selectedDispatch)}
        onClose={() => setSelectedDispatch(null)}
        onApprove={onApproveDispatch}
        onReject={onRejectDispatch}
        onUpdate={onUpdateDispatch}
      />
    </div>
  );
}
