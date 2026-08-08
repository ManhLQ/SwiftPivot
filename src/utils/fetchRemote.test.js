import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRemote } from './fetchRemote.js';

describe('fetchRemote', () => {
  let fetchSpy;

  beforeEach(() => { fetchSpy = vi.spyOn(globalThis, 'fetch'); });
  afterEach(() => { fetchSpy.mockRestore(); });

  it('sends a GET request and returns auto-cast rows', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => [{ id: '1', value: '42' }] });
    const result = await fetchRemote({ url: 'https://api.test/data' });
    expect(fetchSpy).toHaveBeenCalledWith('https://api.test/data', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual([{ id: 1, value: 42 }]);
  });

  it('sends a POST request with JSON body', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => [{ x: '10' }] });
    await fetchRemote({ url: 'https://api.test/query', method: 'POST', body: { filter: 'active' } });
    expect(fetchSpy).toHaveBeenCalledWith('https://api.test/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: 'active' }),
    });
  });

  it('merges custom headers', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchRemote({ url: 'https://api.test/secure', headers: { Authorization: 'Bearer T' } });
    expect(fetchSpy).toHaveBeenCalledWith('https://api.test/secure', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer T' },
    });
  });

  it('extracts nested array using responsePath', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: [{ n: '5' }] } }),
    });
    const result = await fetchRemote({ url: 'https://api.test/nested', responsePath: 'data.items' });
    expect(result).toEqual([{ n: 5 }]);
  });

  it('throws a descriptive error on HTTP failure', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });
    await expect(fetchRemote({ url: 'https://api.test/x' })).rejects.toThrow('HTTP 403: Forbidden');
  });

  it('throws when responsePath does not point to an array', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ data: 'not-an-array' }) });
    await expect(fetchRemote({ url: 'https://api.test/bad', responsePath: 'data' }))
      .rejects.toThrow('Response path "data" did not resolve to an array');
  });

  it('wraps a plain object response in an array', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ id: '7', name: 'Alice' }) });
    const result = await fetchRemote({ url: 'https://api.test/single' });
    expect(result).toEqual([{ id: 7, name: 'Alice' }]);
  });
});
