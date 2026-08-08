import React, { useState, useCallback, useMemo, useEffect } from 'react';
import MenuBar from './components/MenuBar.jsx';
import DataEditor from './components/DataEditor.jsx';
import PivotControls from './components/PivotControls.jsx';
import PivotView from './components/PivotView.jsx';
import ChartPanel from './components/ChartPanel.jsx';
import { deriveDefaultConfig, filterData } from './utils/pivotHelpers.js';
import { loadPersistedData, savePersistedData, clearPersistedData } from './utils/storageHelpers.js';
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

  useEffect(() => {
    const persisted = loadPersistedData();
    if (persisted) {
      setData(persisted.data);
      setPivotConfig(persisted.pivotConfig);
      setChangeLog(persisted.changeLog);
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

  const handleDataLoaded = useCallback((newData) => {
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
    savePersistedData({ data: newData, pivotConfig: newConfig, changeLog: initialLog });
  }, []);

  const handlePurgeData = useCallback(() => {
    clearPersistedData();
    setData([]);
    setChangeLog([]);
    setPivotConfig({
      rows: [],
      columns: [],
      measures: [],
      filters: {},
      aggregation: 'SUM',
    });
  }, []);

  const handleDataChange = useCallback((newData, changeEvent) => {
    const clonedSnapshot = newData.map((row) => ({ ...row }));
    const logWithSnapshot = changeEvent ? { ...changeEvent, dataSnapshot: clonedSnapshot } : null;
    const updatedLog = logWithSnapshot ? [...changeLog, logWithSnapshot] : changeLog;
    setData(newData);
    setChangeLog(updatedLog);
    savePersistedData({ data: newData, pivotConfig, changeLog: updatedLog });
  }, [changeLog, pivotConfig]);

  const handleRevertToLog = useCallback((logId) => {
    const logIndex = changeLog.findIndex((entry) => entry.id === logId);
    if (logIndex === -1) return;

    const targetLog = changeLog[logIndex];
    const targetSnapshot = targetLog.dataSnapshot || changeLog[0]?.dataSnapshot || data;
    const restoredData = targetSnapshot.map((row) => ({ ...row }));
    const updatedLog = changeLog.slice(0, logIndex + 1);

    setData(restoredData);
    setChangeLog(updatedLog);
    savePersistedData({ data: restoredData, pivotConfig, changeLog: updatedLog });
  }, [changeLog, pivotConfig, data]);

  const handleUndo = useCallback(() => {
    if (changeLog.length > 1) {
      const previousLogId = changeLog[changeLog.length - 2].id;
      handleRevertToLog(previousLogId);
    }
  }, [changeLog, handleRevertToLog]);

  const handleConfigChange = useCallback((newConfig) => {
    setPivotConfig(newConfig);
    savePersistedData({ data, pivotConfig: newConfig, changeLog });
  }, [data, changeLog]);

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
        vtableTheme={vtableTheme}
        onThemeChange={handleThemeChange}
        hasData={data.length > 0}
        onPurgeData={handlePurgeData}
        changeLog={changeLog}
        onRevertToLog={handleRevertToLog}
      />

      <main className="app-content">
        {data.length === 0 ? (
          <div className="empty-state-panel">
            <div className="empty-icon">⚡</div>
            <h2>Welcome to Agile Data Pivot</h2>
            <p>Load a dataset using the <strong>File</strong> menu or <strong>Fetch API</strong> button in the top menu bar to begin.</p>
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

