import React, { useState } from 'react';
import { fetchRemote } from '../utils/fetchRemote.js';
import './RemoteSourceModal.css';

function RemoteSourceModal({ onFetched, onClose, embedded = false }) {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [responsePath, setResponsePath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFetch = async () => {
    setError('');
    setSuccessMsg('');

    if (!url.trim()) {
      setError('Please enter a valid URL.');
      return;
    }

    let parsedHeaders = {};
    if (headersText.trim()) {
      try {
        parsedHeaders = JSON.parse(headersText.trim());
      } catch {
        setError('Headers must be valid JSON. Example: {"Authorization": "Bearer token"}');
        return;
      }
    }

    let parsedBody;
    if (method === 'POST' && bodyText.trim()) {
      try {
        parsedBody = JSON.parse(bodyText.trim());
      } catch {
        setError('Request Body must be valid JSON. Example: {"filter": "active"}');
        return;
      }
    }

    const config = {
      url: url.trim(),
      method,
      headers: parsedHeaders,
      body: parsedBody,
      responsePath: responsePath.trim(),
    };

    setLoading(true);
    try {
      const rows = await fetchRemote(config);
      setSuccessMsg(`Loaded ${rows.length} rows`);
      onFetched(rows, config);
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <div className="remote-source-form">
      <div className="rsm-field">
        <label htmlFor="rsm-url" className="rsm-label">URL</label>
        <input
          id="rsm-url"
          type="url"
          className="rsm-input"
          placeholder="https://api.example.com/data"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
        />
      </div>

      <div className="rsm-field rsm-method-row">
        <span className="rsm-label">Method</span>
        <label className="rsm-radio-label">
          <input
            type="radio"
            name="rsm-method"
            value="GET"
            checked={method === 'GET'}
            onChange={() => setMethod('GET')}
            aria-label="GET"
          />
          GET
        </label>
        <label className="rsm-radio-label">
          <input
            type="radio"
            name="rsm-method"
            value="POST"
            checked={method === 'POST'}
            onChange={() => setMethod('POST')}
            aria-label="POST"
          />
          POST
        </label>
      </div>

      <div className="rsm-advanced-section">
        <button
          type="button"
          className="rsm-advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <span className="rsm-toggle-arrow">{showAdvanced ? '▾' : '▸'}</span>
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="rsm-advanced-fields">
            <div className="rsm-field">
              <label htmlFor="rsm-headers" className="rsm-label">
                Headers <span className="rsm-hint">(JSON — for auth etc., optional)</span>
              </label>
              <textarea
                id="rsm-headers"
                className="rsm-textarea"
                rows={3}
                placeholder={'{"Authorization": "Bearer your-token"}'}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                aria-label="Headers"
              />
            </div>

            <div className="rsm-field">
              <label htmlFor="rsm-body" className="rsm-label">
                Request Body <span className="rsm-hint">(JSON, POST only — optional)</span>
              </label>
              <textarea
                id="rsm-body"
                className="rsm-textarea"
                rows={3}
                placeholder={'{"filter": "active", "limit": 100}'}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                disabled={method !== 'POST'}
                aria-label="Request Body"
              />
            </div>

            <div className="rsm-field">
              <label htmlFor="rsm-path" className="rsm-label">
                Response Path <span className="rsm-hint">(dot-path to data array — optional)</span>
              </label>
              <input
                id="rsm-path"
                type="text"
                className="rsm-input"
                placeholder="e.g. data.items  or  results"
                value={responsePath}
                onChange={(e) => setResponsePath(e.target.value)}
                aria-label="Response Path"
              />
              <p className="rsm-path-help">
                Use when JSON wraps the array —{' '}
                <code>{'{ "success": true, "data": { "items": [...] } }'}</code>{' '}
                → path: <code>data.items</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="rsm-error" role="alert">{error}</div>}
      {successMsg && <div className="rsm-success" role="status">✅ {successMsg}</div>}

      <div className="rsm-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={handleFetch} disabled={loading}>
          {loading ? '⏳ Fetching…' : '⬇ Fetch Data'}
        </button>
      </div>
    </div>
  );

  if (embedded) return form;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rsm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🌐 Remote Data Source</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{form}</div>
      </div>
    </div>
  );
}

export default RemoteSourceModal;
