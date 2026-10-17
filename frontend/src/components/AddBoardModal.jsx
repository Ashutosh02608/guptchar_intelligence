import React, { useState } from "react";
import { X, Plus, Globe } from "lucide-react";

export function AddBoardModal({ isOpen, onClose, onAddBoard }) {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [jurisdiction, setJurisdiction] = useState("GLOBAL");
  const [category, setCategory] = useState("Securities & Markets");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAddBoard({
        name,
        short_code: shortCode,
        jurisdiction,
        category,
        website_url: websiteUrl,
        feed_url: feedUrl,
        poll_interval_sec: 10
      });
      onClose();
    } catch (err) {
      console.error("Failed to add board", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ 
          padding: "18px 24px", 
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ 
              width: "32px", 
              height: "32px", 
              borderRadius: "8px", 
              background: "rgba(6, 182, 212, 0.15)", 
              border: "1px solid rgba(6, 182, 212, 0.3)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Globe size={18} color="var(--neon-cyan)" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff" }}>
                Add Regulatory Board to Watchlist
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                Attach custom government portal or RSS feed to 10s monitoring engine
              </p>
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-icon" 
            style={{ width: "28px", height: "28px" }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Authority Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Commodity Futures Trading Commission"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#070a12",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "var(--radius-sm)",
                  color: "#ffffff",
                  fontSize: "0.85rem"
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Short Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. US-CFTC"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#070a12",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "var(--radius-sm)",
                  color: "#ffffff",
                  fontSize: "0.85rem"
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Jurisdiction
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#070a12",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "var(--radius-sm)",
                  color: "#ffffff",
                  fontSize: "0.85rem"
                }}
              >
                <option value="IN">🇮🇳 India (IN)</option>
                <option value="US">🇺🇸 United States (US)</option>
                <option value="UK">🇬🇧 United Kingdom (UK)</option>
                <option value="EU">🇪🇺 European Union (EU)</option>
                <option value="SG">🇸🇬 Singapore (SG)</option>
                <option value="AU">🇦🇺 Australia (AU)</option>
                <option value="HK">🇭🇰 Hong Kong (HK)</option>
                <option value="GLOBAL">🌐 International / Global</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Category
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Derivatives & Commodities"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#070a12",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "var(--radius-sm)",
                  color: "#ffffff",
                  fontSize: "0.85rem"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Official Website URL
            </label>
            <input
              type="url"
              required
              placeholder="https://www.cftc.gov"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#070a12",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--radius-sm)",
                color: "#ffffff",
                fontSize: "0.85rem"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Feed / Announcement URL (RSS XML or Listing Page)
            </label>
            <input
              type="url"
              required
              placeholder="https://www.cftc.gov/rss/pressreleases.xml"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#070a12",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "var(--radius-sm)",
                color: "#ffffff",
                fontSize: "0.85rem"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              id="btn-confirm-add-board"
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting}
            >
              <Plus size={15} />
              <span>Add to Watchlist</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
