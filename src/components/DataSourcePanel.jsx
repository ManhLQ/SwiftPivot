import React, { useState, useRef } from 'react';
import { parseCSV, parseJSON, autoCastTypes } from '../utils/parseData.js';
import './DataSourcePanel.css';

function DataSourcePanel({ onDataLoaded }) {
  const [activeTab, setActiveTab] = useState('file');
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const clearStatus = () => { setError(''); setSuccessMsg(''); };

  const handleFile = async (file) => {
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
    } catch (err) {
      setError(`Failed to parse file: ${err.message}`);
    }
  };

  const handleApiFetch = async () => {
    clearStatus();
    if (!apiUrl.trim()) { setError('Please enter a valid URL.'); return; }
    setLoading(true);
    try {
      const response = await fetch(apiUrl.trim(), { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const json = await response.json();
      const data = Array.isArray(json) ? json : [json];
      const parsed = autoCastTypes(data);
      onDataLoaded(parsed);
      setSuccessMsg(`Loaded ${parsed.length} rows from API`);
    } catch (err) {
      setError(`API fetch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-source-panel">
      <div className="source-tabs">
        <button id="tab-file-upload" className={`source-tab ${activeTab === 'file' ? 'active' : ''}`}
          onClick={() => { setActiveTab('file'); clearStatus(); }}>📁 File Upload</button>
        <button id="tab-api-fetch" className={`source-tab ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => { setActiveTab('api'); clearStatus(); }}>🌐 API Fetch</button>
      </div>
      <div className="source-content">
        {activeTab === 'file' && (
          <div id="file-drop-zone" className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}>
            <div className="icon">📄</div>
            <p>Drop a <strong>.csv</strong> or <strong>.json</strong> file here, or click to browse</p>
            <input ref={fileInputRef} type="file" accept=".csv,.json"
              onChange={(e) => handleFile(e.target.files[0])} id="file-input" />
          </div>
        )}
        {activeTab === 'api' && (
          <div className="api-form">
            <input id="api-url-input" type="url" placeholder="https://api.example.com/data"
              value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApiFetch()} />
            <button id="api-fetch-btn" className="btn-primary" onClick={handleApiFetch} disabled={loading}>
              {loading ? 'Fetching…' : 'Fetch Data'}
            </button>
          </div>
        )}
        {error && <div className="source-error" id="source-error">{error}</div>}
        {successMsg && <div className="source-success" id="source-success">✅ {successMsg}</div>}
      </div>
    </div>
  );
}

export default DataSourcePanel;
