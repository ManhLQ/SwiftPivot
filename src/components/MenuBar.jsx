import React, { useState, useRef } from 'react';
import { parseCSV, parseJSON, autoCastTypes } from '../utils/parseData.js';
import './MenuBar.css';

const THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'simplify', label: 'Simplify' },
];

function MenuBar({ activeView, onViewChange, onDataLoaded, vtableTheme = 'default', onThemeChange, hasData, onPurgeData, changeLog = [], onRevertToLog }) {
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const clearStatus = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleFileChange = async (file) => {
    clearStatus();
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'json'].includes(ext)) {
      setError('Unsupported file type. Please upload .csv or .json files.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = ext === 'csv' ? parseCSV(text) : parseJSON(text);
      onDataLoaded(parsed);
      setSuccessMsg(`Loaded ${parsed.length} rows from ${file.name}`);
      setIsFileMenuOpen(false);
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  };

  const handleApiFetch = async () => {
    clearStatus();
    if (!apiUrl.trim()) {
      setError('Please enter a valid URL.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(apiUrl.trim(), { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      const data = Array.isArray(json) ? json : [json];
      const parsed = autoCastTypes(data);
      onDataLoaded(parsed);
      setSuccessMsg(`Loaded ${parsed.length} rows from API`);
      setTimeout(() => setIsApiModalOpen(false), 1200);
    } catch (err) {
      setError(`API fetch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="menu-bar">
      <div className="menu-brand">
        <span className="brand-logo">⚡</span>
        <span className="brand-title">Agile Data Pivot</span>
      </div>

      <nav className="menu-nav">
        <button
          className={`nav-tab ${activeView === 'analysis' ? 'active' : ''}`}
          onClick={() => onViewChange('analysis')}
        >
          📊 Analysis
        </button>
        <button
          className={`nav-tab ${activeView === 'raw' ? 'active' : ''}`}
          onClick={() => onViewChange('raw')}
        >
          🗃️ Raw Data
        </button>
      </nav>

      <div className="menu-actions">
        <div className="theme-selector-wrapper">
          <label htmlFor="theme-select" className="theme-label">Theme:</label>
          <select
            id="theme-select"
            className="theme-select"
            value={vtableTheme}
            onChange={(e) => onThemeChange && onThemeChange(e.target.value)}
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="file-menu-wrapper">
          <button
            className="menu-btn"
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
          >
            📁 File ▾
          </button>
          {isFileMenuOpen && (
            <div className="file-dropdown">
              <button
                className="dropdown-item"
                onClick={() => fileInputRef.current?.click()}
              >
                📄 Upload CSV / JSON...
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
            </div>
          )}
        </div>

        <button
          className="menu-btn btn-api"
          onClick={() => {
            setIsApiModalOpen(true);
            clearStatus();
          }}
        >
          🌐 Fetch API
        </button>

        {hasData && (
          <button
            type="button"
            className="menu-btn btn-change-log"
            onClick={() => setIsLogModalOpen(true)}
          >
            📜 Change Log ({changeLog.length})
          </button>
        )}

        {hasData && (
          <button className="menu-btn btn-purge" onClick={onPurgeData}>
            🗑️ Purge Data
          </button>
        )}
      </div>

      {isApiModalOpen && (
        <div className="modal-overlay" onClick={() => setIsApiModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌐 Fetch Data from API</h3>
              <button className="modal-close" onClick={() => setIsApiModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">Enter a REST endpoint returning JSON data array.</p>
              <input
                type="url"
                className="api-url-input"
                placeholder="https://api.example.com/data"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiFetch()}
              />
              {error && <div className="modal-error">{error}</div>}
              {successMsg && <div className="modal-success">✅ {successMsg}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsApiModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleApiFetch} disabled={loading}>
                {loading ? 'Fetching…' : 'Fetch Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLogModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLogModalOpen(false)}>
          <div className="modal-content change-log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📜 Audit Change Log ({changeLog.length})</h3>
              <button className="modal-close" onClick={() => setIsLogModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body change-log-modal-body">
              {changeLog.length === 0 ? (
                <p className="empty-log">No change history recorded yet.</p>
              ) : (
                changeLog.slice().reverse().map((entry, index) => (
                  <div key={entry.id} className="change-log-modal-item">
                    <div className="log-item-top">
                      <div className="log-item-meta">
                        <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span className={`log-badge log-${entry.type.toLowerCase()}`}>{entry.type}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-revert-log"
                        onClick={() => {
                          if (onRevertToLog) {
                            onRevertToLog(entry.id);
                          }
                          setIsLogModalOpen(false);
                        }}
                        disabled={index === 0}
                      >
                        ↩️ Reverse
                      </button>
                    </div>
                    <span className="log-summary">{entry.summary}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default MenuBar;
