import React, { useState, useEffect, useRef } from "react";
import { Navigation } from "./components/Navigation";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { BoardsPage } from "./pages/BoardsPage";
import { UpdatesPage } from "./pages/UpdatesPage";
import { OutboxPage } from "./pages/OutboxPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { TelemetryPage } from "./pages/TelemetryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AddBoardModal } from "./components/AddBoardModal";
import { CircularDetailModal } from "./components/CircularDetailModal";
import { AlertBanner } from "./components/AlertBanner";
import { AlertCenterDrawer } from "./components/AlertCenterDrawer";
import { LoginPage } from "./pages/LoginPage";
import { sound } from "./utils/audio";
import { API_BASE, WS_URL } from "./utils/config";

export function App() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, boards, updates, outbox, companies, telemetry, settings
  const [stats, setStats] = useState(null);
  const [boards, setBoards] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [outboxCounts, setOutboxCounts] = useState({ total: 0, pending: 0, sent: 0, rejected: 0 });
  const [companiesCount, setCompaniesCount] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [isSweeping, setIsSweeping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertsList, setAlertsList] = useState([]);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddBoardOpen, setIsAddBoardOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!(localStorage.getItem("guptchar_token") || sessionStorage.getItem("guptchar_token"));
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem("guptchar_user") || sessionStorage.getItem("guptchar_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Verify session token on initial mount
  useEffect(() => {
    const token = localStorage.getItem("guptchar_token") || sessionStorage.getItem("guptchar_token");
    if (token) {
      fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`)
        .then(r => {
          if (r.ok) return r.json();
          throw new Error("Invalid session");
        })
        .then(data => {
          setIsAuthenticated(true);
          if (data.user) setCurrentUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem("guptchar_token");
          localStorage.removeItem("guptchar_user");
          sessionStorage.removeItem("guptchar_token");
          sessionStorage.removeItem("guptchar_user");
          setIsAuthenticated(false);
          setCurrentUser(null);
        });
    }
  }, []);

  // Fetch initial REST data
  const fetchData = async () => {
    try {
      const [resStats, resBoards, resUpdates, resOutbox, resCounts, resCompanies] = await Promise.all([
        fetch(`${API_BASE}/api/status`).then(r => r.json()),
        fetch(`${API_BASE}/api/boards`).then(r => r.json()),
        fetch(`${API_BASE}/api/updates?limit=60`).then(r => r.json()),
        fetch(`${API_BASE}/api/outbox?limit=100`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/outbox/counts`).then(r => r.json()).catch(() => ({ total: 0, pending: 0, sent: 0, rejected: 0 })),
        fetch(`${API_BASE}/api/companies/count`).then(r => r.json()).catch(() => ({ count: 0 }))
      ]);
      setStats(resStats);
      setBoards(resBoards);
      setUpdates(resUpdates);
      setAlertsList(resUpdates.filter(u => u.severity === "CRITICAL" || u.severity === "HIGH"));
      setOutbox(resOutbox || []);
      setOutboxCounts(resCounts || { total: 0, pending: 0, sent: 0, rejected: 0 });
      setCompaniesCount(typeof resCompanies?.count === "number" ? resCompanies.count : (Array.isArray(resCompanies) ? resCompanies.length : 0));

      if (resStats?.uptime_seconds !== undefined) {
        setUptime(Math.round(resStats.uptime_seconds));
      }
    } catch (err) {
      console.warn("Rest fetch error (backend booting up...):", err);
    }
  };

  // WebSocket Connection & Real-Time Monitoring Stream
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();

    function connectWs() {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.log("⚡ [WS Connected] Real-time Surveillance Stream Active");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === "INITIAL_STATE") {
            setStats(msg.data.stats);
            setBoards(msg.data.boards);
            setUpdates(msg.data.updates);
            if (msg.data.stats?.uptime_seconds !== undefined) {
              setUptime(Math.round(msg.data.stats.uptime_seconds));
            }
            if (msg.data.outbox) setOutbox(msg.data.outbox);
            if (msg.data.outbox_counts) setOutboxCounts(msg.data.outbox_counts);
          } else if (msg.type === "TICK") {
            if (msg.data.uptime !== undefined) {
              setUptime(Math.round(msg.data.uptime));
            }
            if (msg.data.seconds_remaining === 1) {
              setIsSweeping(true);
            }
          } else if (msg.type === "SWEEP_START") {
            setIsSweeping(true);
          } else if (msg.type === "SWEEP_COMPLETE") {
            setIsSweeping(false);
            setBoards(msg.data.boards);
            setStats(msg.data.stats);
            if (msg.data.stats?.uptime_seconds !== undefined) {
              setUptime(Math.round(msg.data.stats.uptime_seconds));
            }
          } else if (msg.type === "ALERT_NEW_REGULATION") {
            const newAlert = msg.data;
            setUpdates(prev => [newAlert, ...prev.filter(u => u.id !== newAlert.id)]);
            setAlertsList(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
            setActiveAlert(newAlert);
            
            if (newAlert.severity === "CRITICAL" || newAlert.severity === "HIGH") {
              sound.playCriticalAlert();
            } else {
              sound.playNoticeTone();
            }

            fetch(`${API_BASE}/api/status`).then(r => r.json()).then(setStats);
          } else if (msg.type === "FEED_RESET") {
            setUpdates([]);
            fetch(`${API_BASE}/api/status`).then(r => r.json()).then(setStats);
          } else if (msg.type === "BOARDS_UPDATED") {
            setBoards(msg.data.boards);
          } else if (msg.type === "OUTBOX_UPDATED") {
            setOutbox(msg.data.outbox || []);
            if (msg.data.counts) setOutboxCounts(msg.data.counts);
            // Refresh companies count as well since new companies may have been extracted
            fetch(`${API_BASE}/api/companies`).then(r => r.json()).then(comps => setCompaniesCount(comps.length)).catch(() => {});
          } else if (msg.type === "COMPANY_SUBSCRIPTION_UPDATED") {
            // Subscription changed event
            fetch(`${API_BASE}/api/companies`).then(r => r.json()).then(comps => setCompaniesCount(comps.length)).catch(() => {});
          } else if (msg.type === "ALERT_NEW_DISPATCH") {
            sound.playNoticeTone();
          }
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.warn("WS closed, attempting reconnection in 2s...");
        reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectWs();

    // Continuous 24*7 uptime real-time client ticker
    const uptimeTicker = setInterval(() => {
      setUptime(prev => (prev > 0 ? prev + 1 : 1));
    }, 1000);

    return () => {
      clearInterval(uptimeTicker);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isAuthenticated]);

  // Handlers
  const handleForceSweep = async () => {
    setIsSweeping(true);
    try {
      await fetch(`${API_BASE}/api/trigger-sweep`, { method: "POST" });
    } catch (e) {
      console.error("Sweep trigger error", e);
    }
  };

  const handleToggleBoard = async (boardId, enabled) => {
    try {
      await fetch(`${API_BASE}/api/boards/${boardId}/toggle?enabled=${enabled}`, { method: "PATCH" });
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, enabled } : b));
    } catch (e) {
      console.error("Toggle board failed", e);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    try {
      await fetch(`${API_BASE}/api/boards/${boardId}`, { method: "DELETE" });
      setBoards(prev => prev.filter(b => b.id !== boardId));
    } catch (e) {
      console.error("Delete board failed", e);
    }
  };

  const handleAddBoard = async (payload) => {
    const res = await fetch(`${API_BASE}/api/boards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const newBoard = await res.json();
    setBoards(prev => [...prev, newBoard]);
    return newBoard;
  };

  const handleMarkRead = async (updateId) => {
    try {
      await fetch(`${API_BASE}/api/updates/${updateId}/read`, { method: "POST" });
      setUpdates(prev => prev.map(u => u.id === updateId ? { ...u, is_read: true } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${API_BASE}/api/updates/mark-all-read`, { method: "POST" });
      setUpdates(prev => prev.map(u => ({ ...u, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetFeed = async () => {
    try {
      await fetch(`${API_BASE}/api/reset-feed`, { method: "POST" });
      setUpdates([]);
      fetch(`${API_BASE}/api/status`).then(r => r.json()).then(setStats);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleMute = () => {
    const isNowMuted = sound.toggleMute();
    setIsMuted(isNowMuted);
  };

  // Auth Handlers
  const handleLoginSuccess = (user, token) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Logout error", e);
    }
    localStorage.removeItem("guptchar_token");
    localStorage.removeItem("guptchar_user");
    sessionStorage.removeItem("guptchar_token");
    sessionStorage.removeItem("guptchar_user");
    setIsAuthenticated(false);
    setCurrentUser(null);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // Outbox Dispatches Handlers
  const handleApproveDispatch = async (dispatchId) => {
    try {
      const res = await fetch(`${API_BASE}/api/outbox/${dispatchId}/approve`, { method: "POST" });
      const updated = await res.json();
      setOutbox(prev => prev.map(d => d.id === dispatchId ? updated : d));
      sound.playNoticeTone();
    } catch (e) {
      console.error("Approve error", e);
    }
  };

  const handleRejectDispatch = async (dispatchId) => {
    try {
      const res = await fetch(`${API_BASE}/api/outbox/${dispatchId}/reject`, { method: "POST" });
      const updated = await res.json();
      setOutbox(prev => prev.map(d => d.id === dispatchId ? updated : d));
    } catch (e) {
      console.error("Reject error", e);
    }
  };

  const handleUpdateDispatch = async (dispatchId, updatesPayload) => {
    try {
      const res = await fetch(`${API_BASE}/api/outbox/${dispatchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatesPayload)
      });
      const updated = await res.json();
      setOutbox(prev => prev.map(d => d.id === dispatchId ? updated : d));
    } catch (e) {
      console.error("Update dispatch error", e);
    }
  };

  const handleBatchSend = async () => {
    try {
      await fetch(`${API_BASE}/api/outbox/batch-send`, { method: "POST" });
      const freshOutbox = await fetch(`${API_BASE}/api/outbox?limit=100`).then(r => r.json());
      setOutbox(freshOutbox || []);
      sound.playNoticeTone();
    } catch (e) {
      console.error("Batch send error", e);
    }
  };

  const handleDeleteDispatch = async (dispatchId) => {
    try {
      await fetch(`${API_BASE}/api/outbox/${dispatchId}`, { method: "DELETE" });
      setOutbox(prev => prev.filter(d => d.id !== dispatchId));
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  const handleClearOutbox = async () => {
    try {
      await fetch(`${API_BASE}/api/outbox`, { method: "DELETE" });
      setOutbox([]);
      setOutboxCounts({ total: 0, pending: 0, sent: 0, rejected: 0 });
    } catch (e) {
      console.error("Clear outbox error", e);
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const unreadAlertsCount = alertsList.filter(a => !a.is_read).length;
  const criticalAlertsCount = alertsList.filter(a => a.severity === "CRITICAL" && !a.is_read).length;

  return (
    <div style={{ maxWidth: "1480px", margin: "0 auto", padding: "16px 24px 60px" }}>
      {/* Toast Alert Banner on Critical Incoming Circular */}
      <AlertBanner 
        alert={activeAlert} 
        onDismiss={() => setActiveAlert(null)} 
        onViewDetails={(item) => setSelectedItem(item)} 
        onOpenAlertCenter={() => {
          setActiveAlert(null);
          setIsAlertCenterOpen(true);
        }}
        queueCount={unreadAlertsCount}
      />

      {/* Modern Multi-Page Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSweeping={isSweeping}
        onForceSweep={handleForceSweep}
        onOpenAddBoard={() => setIsAddBoardOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        boardsCount={boards.length}
        updatesCount={updates.filter(u => !u.is_read).length}
        outboxCount={outbox.filter(d => d.status === "PENDING_REVIEW").length}
        companiesCount={companiesCount}
        alertsCount={unreadAlertsCount}
        criticalAlertsCount={criticalAlertsCount}
        onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Active Page View */}
      <main>
        {activeTab === "overview" && (
          <CommandCenterPage
            stats={stats}
            boards={boards}
            updates={updates}
            uptime={uptime}
            onToggleBoard={handleToggleBoard}
            onSelectUpdate={(item) => setSelectedItem(item)}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onResetFeed={handleResetFeed}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === "boards" && (
          <BoardsPage
            boards={boards}
            onToggleBoard={handleToggleBoard}
            onOpenAddBoard={() => setIsAddBoardOpen(true)}
            onDeleteBoard={handleDeleteBoard}
          />
        )}

        {activeTab === "updates" && (
          <UpdatesPage
            updates={updates}
            onSelectUpdate={(item) => setSelectedItem(item)}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onResetFeed={handleResetFeed}
          />
        )}

        {activeTab === "outbox" && (
          <OutboxPage
            outbox={outbox}
            outboxCounts={outboxCounts}
            onApproveDispatch={handleApproveDispatch}
            onRejectDispatch={handleRejectDispatch}
            onUpdateDispatch={handleUpdateDispatch}
            onBatchSend={handleBatchSend}
            onDeleteDispatch={handleDeleteDispatch}
            onClearOutbox={handleClearOutbox}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "companies" && (
          <CompaniesPage
            API_BASE={API_BASE}
          />
        )}

        {activeTab === "telemetry" && (
          <TelemetryPage
            stats={stats}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onResetFeed={handleResetFeed}
          />
        )}
      </main>

      {/* Global Modals */}
      <AddBoardModal
        isOpen={isAddBoardOpen}
        onClose={() => setIsAddBoardOpen(false)}
        onAddBoard={handleAddBoard}
      />

      <CircularDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {/* Surveillance Alert Center Slide-Over Drawer */}
      <AlertCenterDrawer
        isOpen={isAlertCenterOpen}
        onClose={() => setIsAlertCenterOpen(false)}
        alerts={alertsList}
        onSelectAlert={(item) => {
          setSelectedItem(item);
          handleMarkRead(item.id);
        }}
        onDismissAlert={(alertId) => {
          setAlertsList(prev => prev.filter(a => a.id !== alertId));
        }}
        onAcknowledgeAll={() => {
          setAlertsList(prev => prev.map(a => ({ ...a, is_read: true })));
          handleMarkAllRead();
        }}
        onClearAll={() => {
          setAlertsList([]);
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Status Bar Footer */}
      <footer style={{ 
        marginTop: "40px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        fontSize: "0.74rem", 
        color: "var(--text-dim)",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        paddingTop: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            background: wsConnected ? "var(--neon-emerald)" : "var(--neon-amber)" 
          }} />
          <span>
            {wsConnected ? "WebSocket Stream Connected" : "Connecting to Guptchar Engine..."}
          </span>
          <span>•</span>
          <span>Guptchar Surveillance v1.2</span>
        </div>

        <div>
          <span>24*7 Autonomous Surveillance Active</span>
          <span style={{ margin: "0 8px" }}>•</span>
          <span>Continuous Regulatory Engine</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
