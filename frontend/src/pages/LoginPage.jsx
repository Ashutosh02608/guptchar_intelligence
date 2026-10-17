import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Radio, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { sound } from "../utils/audio";

const API_BASE = "http://127.0.0.1:8000";

export function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await res.json();
      if (res.ok && data.token) {
        if (rememberMe) {
          localStorage.setItem("guptchar_token", data.token);
          localStorage.setItem("guptchar_user", JSON.stringify(data.user));
        } else {
          sessionStorage.setItem("guptchar_token", data.token);
          sessionStorage.setItem("guptchar_user", JSON.stringify(data.user));
        }
        sound.playNoticeTone();
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMessage(data.detail || "Authentication failed. Invalid credentials.");
      }
    } catch (err) {
      setErrorMessage(`Network error connecting to surveillance server: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Dynamic Ambient Background Glows */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none"
      }} />

      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "15%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)",
        filter: "blur(70px)",
        pointerEvents: "none"
      }} />

      {/* Main Glassmorphic Login Container */}
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "460px",
        padding: "40px 36px",
        borderRadius: "16px",
        position: "relative",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {/* Ambient Top Glow Border */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, transparent, var(--neon-emerald), var(--neon-cyan), transparent)"
        }} />

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: "0 0 25px rgba(16, 185, 129, 0.3)"
          }}>
            <Radio size={28} style={{ color: "var(--neon-emerald)" }} className="animate-pulse-slow" />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", letterSpacing: "0.04em", margin: 0 }}>
              GUPTCHAR
            </h1>
            <span className="badge badge-healthy" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
              SURVEILLANCE
            </span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Autonomous Financial Regulatory Surveillance Engine
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div style={{
            background: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            color: "var(--neon-rose)",
            fontSize: "0.82rem"
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Username / Email Field */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.76rem",
              fontWeight: "600",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "8px"
            }}>
              Operator Identity / Email
            </label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
                display: "flex"
              }}>
                <User size={18} />
              </div>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                placeholder="admin or admin@guptchar.local"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--neon-emerald)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: "block",
              fontSize: "0.76rem",
              fontWeight: "600",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "8px"
            }}>
              Security Key / Password
            </label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
                display: "flex"
              }}>
                <Lock size={18} />
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter authorized security key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 44px 12px 42px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--neon-emerald)"}
                onBlur={(e) => e.target.style.borderColor = "var(--border-subtle)"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  display: "flex",
                  padding: "4px"
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dim)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "var(--neon-emerald)" }}
              />
              <span>Remember session on this device</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              padding: "13px",
              fontSize: "0.95rem",
              fontWeight: "700",
              justifyContent: "center",
              marginTop: "6px",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)"
            }}
          >
            {isLoading ? (
              <span>Authenticating Operator...</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Sign In to Command Center</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>


        {/* Restricted Access Notice (Emphasizing No Signup) */}
        <div style={{
          marginTop: "18px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--text-dim)",
          fontSize: "0.72rem",
          lineHeight: 1.4,
          textAlign: "center",
          justifyContent: "center"
        }}>
          <ShieldAlert size={14} style={{ flexShrink: 0, color: "var(--neon-amber)" }} />
          <span>Restricted Portal: Public registration is closed. Only verified compliance operators may log in.</span>
        </div>

      </div>
    </div>
  );
}
