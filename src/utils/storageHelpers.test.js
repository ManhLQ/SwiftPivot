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

describe('storageHelpers – remoteConfig and dataSource', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips remoteConfig and dataSource=remote', () => {
    const config = { url: 'https://api.test/data', method: 'GET', headers: {}, body: undefined, responsePath: '' };
    savePersistedData({
      data: [{ id: 1 }],
      pivotConfig: { rows: [], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: [],
      remoteConfig: config,
      dataSource: 'remote',
    });
    const result = loadPersistedData();
    expect(result.remoteConfig).toEqual(config);
    expect(result.dataSource).toBe('remote');
  });

  it('round-trips remoteConfig=null and dataSource=local', () => {
    savePersistedData({
      data: [{ id: 1 }],
      pivotConfig: { rows: [], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: [],
      remoteConfig: null,
      dataSource: 'local',
    });
    const result = loadPersistedData();
    expect(result.remoteConfig).toBeNull();
    expect(result.dataSource).toBe('local');
  });

  it('returns remoteConfig: null, dataSource: null for legacy v1 payloads', () => {
    // Simulate a v1 payload (no remoteConfig/dataSource fields)
    const v1payload = {
      version: 1,
      data: [{ id: 1 }],
      pivotConfig: { rows: [], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1payload));
    const result = loadPersistedData();
    expect(result.remoteConfig).toBeNull();
    expect(result.dataSource).toBeNull();
  });
});

