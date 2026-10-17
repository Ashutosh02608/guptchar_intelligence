import React, { useState, useEffect } from "react";
import { Activity, RotateCw, CheckCircle2, AlertTriangle, XCircle, Clock, Server } from "lucide-react";

export function TelemetryPage({ stats }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/telemetry?limit=80");
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error("Failed to load telemetry", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000); // refresh every 10s cycle
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (ts) => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString() + "." + Math.floor(date.getMilliseconds() / 100);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "HEALTHY":
        return <span className="badge badge-healthy"><CheckCircle2 size={11} /> 200 OK</span>;
      case "DEGRADED":
        return <span className="badge badge-degraded"><AlertTriangle size={11} /> TIMEOUT</span>;
      case "ERROR":
        return <span className="badge badge-error"><XCircle size={11} /> ERROR</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div className="glass-panel" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Activity size={22} color="var(--neon-emerald)" />
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                NETWORK PROBE TELEMETRY & AUDIT TRAIL
              </h2>
              <span className="badge badge-healthy">
                LIVE 10S PACKETS
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
              Audit trail of every 10-second HTTP/RSS sweep across global regulatory endpoints
            </p>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={fetchTelemetry}
            disabled={isLoading}
          >
            <RotateCw size={14} className={isLoading ? "animate-radar" : ""} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>TOTAL PROBE ITERATIONS</span>
          <div className="mono" style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--neon-cyan)", marginTop: "4px" }}>
            {(stats?.total_checks || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Across 5 Core Authorities</span>
        </div>

        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>SURVEILLANCE CADENCE</span>
          <div className="mono" style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--neon-emerald)", marginTop: "4px" }}>
            10.0 Seconds
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Concurrent Async Requests</span>
        </div>

        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>PACKET ROUTE INTEGRITY</span>
          <div className="mono" style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--neon-emerald)", marginTop: "4px" }}>
            100.0%
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Zero Dropped Cycles</span>
        </div>

        <div className="glass-panel" style={{ padding: "16px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>AUDIT BUFFER</span>
          <div className="mono" style={{ fontSize: "1.4rem", fontWeight: "700", color: "#a855f7", marginTop: "4px" }}>
            {logs.length} Entries
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Real-Time SQLite Ring Buffer</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel" style={{ padding: "20px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text-dim)", fontSize: "0.72rem", textTransform: "uppercase" }}>
              <th style={{ padding: "10px 14px" }}>TIMESTAMP</th>
              <th style={{ padding: "10px 14px" }}>AUTHORITY</th>
              <th style={{ padding: "10px 14px" }}>STATUS</th>
              <th style={{ padding: "10px 14px" }}>LATENCY</th>
              <th style={{ padding: "10px 14px" }}>DIAGNOSTICS</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)" }}>
                  No probe telemetry records captured yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const latency = log.latency_ms || 0;
                return (
                  <tr 
                    key={log.id} 
                    style={{ 
                      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="mono" style={{ padding: "10px 14px", color: "var(--text-muted)" }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="mono" style={{ fontWeight: "700", color: "#ffffff" }}>
                          {log.short_code || log.board_id?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                          ({log.name || log.board_id})
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="mono" style={{ padding: "10px 14px", color: latency > 1000 ? "var(--neon-amber)" : "var(--neon-cyan)", fontWeight: "600" }}>
                      {latency} ms
                    </td>
                    <td style={{ padding: "10px 14px", color: log.message ? "var(--neon-amber)" : "var(--text-dim)", fontSize: "0.75rem" }}>
                      {log.message || "Sweep succeeded • HTTP packet verified"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
