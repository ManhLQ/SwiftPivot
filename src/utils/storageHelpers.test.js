import { describe, it, expect, beforeEach, vi } from 'vitest';
import { savePersistedData, loadPersistedData, clearPersistedData, STORAGE_KEY } from './storageHelpers.js';

describe('storageHelpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy array data to unified structure', () => {
    const legacy = [{ a: 1 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const loaded = loadPersistedData();
    expect(loaded).not.toBeNull();
    expect(loaded.data).toEqual(legacy);
    expect(loaded.pivotConfig).toBeDefined();
    expect(loaded.changeLog.length).toBeGreaterThan(0);
  });

  it('saves and loads unified storage structure', () => {
    const payload = {
      data: [{ a: 1 }],
      pivotConfig: { rows: ['a'], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: [{ id: '1', timestamp: 123, type: 'DATA_LOADED', summary: 'Loaded', dataSnapshot: [{ a: 1 }] }],
    };
    savePersistedData(payload);
    const loaded = loadPersistedData();
    expect(loaded.data).toEqual(payload.data);
    expect(loaded.pivotConfig).toEqual(payload.pivotConfig);
    expect(loaded.changeLog).toEqual(payload.changeLog);
  });

  it('returns null when no data is in localStorage or data is invalid', () => {
    expect(loadPersistedData()).toBeNull();
    localStorage.setItem(STORAGE_KEY, 'invalid-json');
    expect(loadPersistedData()).toBeNull();
  });

  it('clears persisted data from localStorage when clearPersistedData is called or when replacing data', () => {
    const payload = {
      data: [{ id: 1 }],
      pivotConfig: { rows: [] },
      changeLog: []
    };
    savePersistedData(payload);
    clearPersistedData();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const spyRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const newPayload = {
      data: [{ id: 2 }],
      pivotConfig: { rows: [] },
      changeLog: []
    };
    savePersistedData(newPayload);
    expect(spyRemove).toHaveBeenCalledWith(STORAGE_KEY);
    const loaded = loadPersistedData();
    expect(loaded.data).toEqual(newPayload.data);
  });
});
