import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import MenuBar from './components/MenuBar.jsx';
import DataEditor from './components/DataEditor.jsx';
import PivotControls from './components/PivotControls.jsx';
import PivotView from './components/PivotView.jsx';
import ChartPanel from './components/ChartPanel.jsx';
import { deriveDefaultConfig, filterData } from './utils/pivotHelpers.js';
import { loadPersistedData, savePersistedData, clearPersistedData } from './utils/storageHelpers.js';
import { parseCSV, parseJSON } from './utils/parseData.js';
import { fetchRemote } from './utils/fetchRemote.js';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [activeView, setActiveView] = useState('analysis');
  const [vtableTheme, setVtableTheme] = useState('default');
  const [changeLog, setChangeLog] = useState([]);
  const [pivotConfig, setPivotConfig] = useState({
    rows: [],
    columns: [],
    measures: [],
    filters: {},
    aggregation: 'SUM',
  });
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const [remoteConfig, setRemoteConfig] = useState(null);
  const [dataSource, setDataSource] = useState(null); // 'remote' | 'local' | null
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) {
      setData(persisted.data);
      setPivotConfig(persisted.pivotConfig);
      setChangeLog(persisted.changeLog);
      setRemoteConfig(persisted.remoteConfig ?? null);
      setDataSource(persisted.dataSource ?? null);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', vtableTheme);
  }, [vtableTheme]);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const filteredData = useMemo(() => {
    return filterData(data, pivotConfig.filters);
  }, [data, pivotConfig.filters]);

  const handleDataLoaded = useCallback((newData, sourceOverride = {}) => {
    const clonedData = newData.map((row) => ({ ...row }));
    const initialLog = [{
      id: `log_${Date.now()}`,
      timestamp: Date.now(),
      type: 'DATA_LOADED',
      summary: `Loaded dataset (${newData.length} rows)`,
      dataSnapshot: clonedData,
    }];
    const newConfig = deriveDefaultConfig(newData);
    setData(newData);
    setPivotConfig(newConfig);
    setChangeLog(initialLog);
    const targetRemoteConfig = 'remoteConfig' in sourceOverride ? sourceOverride.remoteConfig : remoteConfig;
    const targetDataSource = 'dataSource' in sourceOverride ? sourceOverride.dataSource : dataSource;
    savePersistedData({
      data: newData,
      pivotConfig: newConfig,
      changeLog: initialLog,
      remoteConfig: targetRemoteConfig,
      dataSource: targetDataSource,
    });
  }, [remoteConfig, dataSource]);

  const handleRemoteFetched = useCallback((rows, config) => {
    setRemoteConfig(config);
    setDataSource('remote');
    setRefreshError('');
    handleDataLoaded(rows, { remoteConfig: config, dataSource: 'remote' });
  }, [handleDataLoaded]);

  const handleRefresh = useCallback(async () => {
    if (!remoteConfig) return;
    setIsRefreshing(true);
    setRefreshError('');
    try {
      const rows = await fetchRemote(remoteConfig);
      handleDataLoaded(rows, { remoteConfig, dataSource: 'remote' });
    } catch (err) {
      setRefreshError(err.message);
      console.error('Refresh failed:', err);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, [remoteConfig, handleDataLoaded]);

  const handlePurgeData = useCallback(() => {
    clearPersistedData();
    setData([]);
    setChangeLog([]);
    setRemoteConfig(null);
    setDataSource(null);
    setIsRefreshing(false);
    setRefreshError('');
    setPivotConfig({
      rows: [],
      columns: [],
      measures: [],
      filters: {},
      aggregation: 'SUM',
    });
  }, []);

  const handleLocalFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'json'].includes(ext)) {
      setImportError('Unsupported file type. Please upload .csv or .json files.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = ext === 'csv' ? parseCSV(text) : parseJSON(text);
      setRemoteConfig(null);
      setDataSource('local');
      handleDataLoaded(parsed, { remoteConfig: null, dataSource: 'local' });
    } catch (err) {
      setImportError(`Failed to parse file: ${err.message}`);
    }
  };

  const handleDataChange = useCallback((newData, changeEvent) => {
    const clonedSnapshot = newData.map((row) => ({ ...row }));
    const logWithSnapshot = changeEvent ? { ...changeEvent, dataSnapshot: clonedSnapshot } : null;
    const updatedLog = logWithSnapshot ? [...changeLog, logWithSnapshot] : changeLog;
    setData(newData);
    setChangeLog(updatedLog);
    savePersistedData({ data: newData, pivotConfig, changeLog: updatedLog, remoteConfig, dataSource });
  }, [changeLog, pivotConfig, remoteConfig, dataSource]);

  const handleRevertToLog = useCallback((logId) => {
    const logIndex = changeLog.findIndex((entry) => entry.id === logId);
    if (logIndex === -1) return;

    const targetLog = changeLog[logIndex];
    const targetSnapshot = targetLog.dataSnapshot || changeLog[0]?.dataSnapshot || data;
    const restoredData = targetSnapshot.map((row) => ({ ...row }));
    const updatedLog = changeLog.slice(0, logIndex + 1);

    setData(restoredData);
    setChangeLog(updatedLog);
    savePersistedData({ data: restoredData, pivotConfig, changeLog: updatedLog, remoteConfig, dataSource });
  }, [changeLog, pivotConfig, data, remoteConfig, dataSource]);

  const handleUndo = useCallback(() => {
    if (changeLog.length > 1) {
      const previousLogId = changeLog[changeLog.length - 2].id;
      handleRevertToLog(previousLogId);
    }
  }, [changeLog, handleRevertToLog]);

  const handleConfigChange = useCallback((newConfig) => {
    setPivotConfig(newConfig);
    savePersistedData({ data, pivotConfig: newConfig, changeLog, remoteConfig, dataSource });
  }, [data, changeLog, remoteConfig, dataSource]);

  const handleThemeChange = useCallback((newTheme) => {
    setVtableTheme(newTheme);
  }, []);

  const originalData = useMemo(() => {
    return changeLog[0]?.dataSnapshot || [];
  }, [changeLog]);

  return (
    <div className="app-container">
      <MenuBar
        activeView={activeView}
        onViewChange={setActiveView}
        onDataLoaded={handleDataLoaded}
        onFetched={handleRemoteFetched}
        onLocalFileLoaded={(rows) => handleDataLoaded(rows, { remoteConfig: null, dataSource: 'local' })}
        vtableTheme={vtableTheme}
        onThemeChange={handleThemeChange}
        hasData={data.length > 0}
        onPurgeData={handlePurgeData}
        changeLog={changeLog}
        onRevertToLog={handleRevertToLog}
        onRefresh={dataSource === 'remote' ? handleRefresh : undefined}
        isRefreshing={isRefreshing}
        refreshError={refreshError}
      />

      <main className="app-content">
        {data.length === 0 ? (
          <div className="home-container">
            <div className="home-hero">
              <div className="hero-logo">⚡</div>
              <h1>Welcome to SwiftPivot</h1>
              <p className="sr-only">
                Load a dataset using the file menu or the local uploader below to begin.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <span className="feature-icon">📂</span>
                <h3>Local Ingestion</h3>
                <p>Ingest CSV or JSON datasets directly from your local machine.</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">📊</span>
                <h3>Pivot & Basic Charts</h3>
                <p>Drag fields to rows/columns, customize aggregates, and plot charts dynamically.</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">📝</span>
                <h3>Inline Data Editor</h3>
                <p>Edit data rows inline with immediate pivot updates and full change history log.</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🛡️</span>
                <h3>Secure Sandbox</h3>
                <p>Purely client-side. No backend servers, no cloud uploads. Your data stays in your browser.</p>
              </div>
            </div>

            <div className="home-upload-zone">
              <h2>Select a CSV or JSON file to begin</h2>
              <button 
                type="button" 
                className="btn-primary btn-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Open Local Dataset
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={handleLocalFileChange}
              />
              {importError && <div className="home-import-error">{importError}</div>}
              <div className="home-privacy-note">
                <span>🔒</span>
                <span>All file parsing and pivot processing happens 100% locally in your browser sandbox.</span>
              </div>
            </div>
          </div>
        ) : activeView === 'raw' ? (
          <DataEditor
            data={data}
            originalData={originalData}
            onDataChange={handleDataChange}
          />
        ) : (
          <div className="dashboard-grid">
            <div className="dashboard-left-pane">
              <div className="pivot-view-wrapper">
                <PivotView
                  data={filteredData}
                  rawDataLength={data.length}
                  pivotConfig={pivotConfig}
                  vtableTheme={vtableTheme}
                />
              </div>
            </div>
            <div className="dashboard-right-pane">
              <ChartPanel data={filteredData} rawDataLength={data.length} pivotConfig={pivotConfig} />
              <PivotControls
                columns={columns}
                data={data}
                pivotConfig={pivotConfig}
                onConfigChange={handleConfigChange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

