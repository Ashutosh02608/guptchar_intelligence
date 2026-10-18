import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardHeader } from "./components/DashboardHeader";
import { Navigation } from "./components/Navigation";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { BoardsPage } from "./pages/BoardsPage";
import { UpdatesPage } from "./pages/UpdatesPage";
import { OutboxPage } from "./pages/OutboxPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { TelemetryPage } from "./pages/TelemetryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ComplianceCalendarPage } from "./pages/ComplianceCalendarPage";
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

  // Collapsible Sidebar State with LocalStorage Persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("guptchar_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("guptchar_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
    <div className="dashboard-layout-wrapper">
      {/* Collapsible Left Sidebar Flight Deck */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
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
        wsConnected={wsConnected}
        uptime={uptime}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Dashboard Canvas Pane */}
      <div className="dashboard-main-content">
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

        {/* Dashboard Topbar with Breadcrumb & Operational Triggers */}
        <DashboardHeader
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleSidebarCollapse}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSweeping={isSweeping}
          onForceSweep={handleForceSweep}
          onOpenAddBoard={() => setIsAddBoardOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          alertsCount={unreadAlertsCount}
          criticalAlertsCount={criticalAlertsCount}
          onOpenAlertCenter={() => setIsAlertCenterOpen(true)}
          currentUser={currentUser}
          wsConnected={wsConnected}
        />

        {/* Active Page View */}
        <main style={{ flex: 1 }}>
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

        {activeTab === "calendar" && (
          <ComplianceCalendarPage
            updates={updates}
            onSelectUpdate={(item) => setSelectedItem(item)}
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
      <footer className="app-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            background: wsConnected ? "var(--neon-emerald)" : "var(--neon-amber)",
            flexShrink: 0
          }} />
          <span>
            {wsConnected ? "WebSocket Stream Connected" : "Connecting to Guptchar Engine..."}
          </span>
          <span>•</span>
          <span>Guptchar Surveillance v1.2</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span>24*7 Autonomous Surveillance Active</span>
          <span>•</span>
          <span>Continuous Regulatory Engine</span>
        </div>
      </footer>
      </div>

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

      {/* Mobile Floating Bottom Bar for Quick 1-Tap Switching */}
      <div 
        className="hide-desktop"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(10, 15, 29, 0.94)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "6px 10px calc(env(safe-area-inset-bottom, 8px) + 4px)",
          zIndex: 90,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)"
        }}
      >
        {[
          { id: "overview", label: "Radar", icon: "📡" },
          { id: "boards", label: "Boards", icon: "🌐", badge: boards.length },
          { id: "updates", label: "Updates", icon: "📄", badge: updates.filter(u => !u.is_read).length },
          { id: "outbox", label: "Outbox", icon: "✉️", badge: outbox.filter(d => d.status === "PENDING_REVIEW").length },
          { id: "companies", label: "CRM", icon: "🏢", badge: companiesCount }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? "rgba(16, 185, 129, 0.18)" : "transparent",
                border: isActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
                borderRadius: "8px",
                padding: "4px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                color: isActive ? "#ffffff" : "var(--text-dim)",
                fontSize: "0.68rem",
                fontWeight: isActive ? "700" : "500",
                cursor: "pointer",
                position: "relative",
                minWidth: "54px"
              }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span style={{
                  position: "absolute",
                  top: "-2px",
                  right: "6px",
                  background: tab.id === "outbox" ? "var(--neon-amber)" : "var(--neon-emerald)",
                  color: "#ffffff",
                  fontSize: "0.55rem",
                  fontWeight: "800",
                  padding: "0 4px",
                  borderRadius: "8px",
                  lineHeight: "13px"
                }}>
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
