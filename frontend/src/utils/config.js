/**
 * Centralized API & WebSocket Configuration for Guptchar Dashboard.
 * Works seamlessly across:
 *  1. Local Development (Vite on :5173 -> Backend on :8000)
 *  2. Unified Production Deployments (FastAPI serving React on same origin)
 *  3. Split Cloud Deployments (e.g. Vercel frontend + Render/Railway backend)
 */

export const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    // If running in local Vite dev server on port 5173, route to default backend port 8000
    if (window.location.port === "5173") {
      return "http://127.0.0.1:8000";
    }
    // Unified deployment on same origin (Render, Railway, Docker, VPS)
    return window.location.origin;
  }
  return "http://127.0.0.1:8000";
};

export const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== "undefined") {
    if (window.location.port === "5173") {
      return "ws://127.0.0.1:8000/ws";
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return "ws://127.0.0.1:8000/ws";
};

export const API_BASE = getApiBase();
export const WS_URL = getWsUrl();
