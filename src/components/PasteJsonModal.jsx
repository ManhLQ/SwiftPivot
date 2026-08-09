import React, { useState } from 'react';
import { parseJSON } from '../utils/parseData.js';
import './PasteJsonModal.css';

function PasteJsonModal({ onLoaded, onClose, embedded = false }) {
  const [jsonText, setJsonText] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleProcess = () => {
    setError('');
    setSuccessMsg('');

    if (!jsonText.trim()) {
      setError('Please paste JSON text into the area above.');
      return;
    }

    try {
      const rows = parseJSON(jsonText, dataPath);
      setSuccessMsg(`Successfully processed ${rows.length} rows`);
      onLoaded(rows);
      if (!embedded && onClose) {
        setTimeout(() => onClose(), 800);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const form = (
    <div className="paste-json-form">
      <div className="pjm-field">
        <label htmlFor="paste-json-textarea" className="pjm-label">
          Paste JSON Content <span className="pjm-hint">(JSON array or object)</span>
        </label>
        <textarea
          id="paste-json-textarea"
          className="pjm-textarea"
          rows={8}
          placeholder='[\n  {"id": 1, "name": "Item A"},\n  {"id": 2, "name": "Item B"}\n]'
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          aria-label="Paste JSON"
        />
      </div>

      <div className="pjm-field">
        <label htmlFor="paste-json-path" className="pjm-label">
          Data Path <span className="pjm-hint">(optional, e.g. result.data or data.items)</span>
        </label>
        <input
          id="paste-json-path"
          type="text"
          className="pjm-input"
          placeholder="e.g. result.data"
          value={dataPath}
          onChange={(e) => setDataPath(e.target.value)}
          aria-label="Data Path"
        />
        <p className="pjm-hint-text">
          By default, top-level JSON arrays are accepted. Use Data Path if the array is nested inside an object.
        </p>
      </div>

      {error && <div className="pjm-error" id="paste-json-error" role="alert">{error}</div>}
      {successMsg && <div className="pjm-success" id="paste-json-success" role="status">✅ {successMsg}</div>}

      <div className="pjm-actions">
        {!embedded && (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        )}
        <button
          type="button"
          id="paste-json-submit"
          className="btn-primary"
          onClick={handleProcess}
        >
          📋 Load JSON Data
        </button>
      </div>
    </div>
  );

  if (embedded) return form;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pjm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 Paste Raw JSON Data</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{form}</div>
      </div>
    </div>
  );
}

export default PasteJsonModal;
