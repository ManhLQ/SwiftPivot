import { deriveDefaultConfig } from './pivotHelpers.js';

export const STORAGE_KEY = 'agile_pivot_data';
export const MAX_LOG_ENTRIES = 100;

export function savePersistedData({ data, pivotConfig, changeLog } = {}) {
  try {
    const rawData = Array.isArray(data) ? data : [];
    const cappedLog = Array.isArray(changeLog) ? changeLog.slice(-MAX_LOG_ENTRIES) : [];
    
    // For large datasets (>500 rows), strip heavy dataSnapshot copies to prevent LocalStorage quota overflow
    const sanitizedLog = rawData.length > 500
      ? cappedLog.map((entry) => {
          if (!entry || typeof entry !== 'object') return entry;
          const { dataSnapshot: _dataSnapshot, ...rest } = entry;
          return rest;
        })
      : cappedLog;

    const payload = {
      version: 1,
      data: rawData,
      pivotConfig: pivotConfig || { rows: [], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: sanitizedLog,
    };
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function loadPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Handle legacy array format
    if (Array.isArray(parsed) && parsed.length > 0) {
      return {
        data: parsed,
        pivotConfig: deriveDefaultConfig(parsed),
        changeLog: [{
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          type: 'DATA_LOADED',
          summary: `Loaded dataset (${parsed.length} rows)`
        }]
      };
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data) && parsed.data.length > 0) {
      const rawLog = Array.isArray(parsed.changeLog) ? parsed.changeLog : [];
      const hydratedLog = rawLog.map((entry) => {
        if (!entry.dataSnapshot || !Array.isArray(entry.dataSnapshot)) {
          return { ...entry, dataSnapshot: parsed.data.map((row) => ({ ...row })) };
        }
        return entry;
      });
      return {
        data: parsed.data,
        pivotConfig: parsed.pivotConfig || deriveDefaultConfig(parsed.data),
        changeLog: hydratedLog,
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
    return null;
  }
}

export function clearPersistedData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear state from localStorage:', err);
  }
}
