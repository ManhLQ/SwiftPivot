import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataSourcePanel from './DataSourcePanel.jsx';
import * as fetchRemoteModule from '../utils/fetchRemote.js';

describe('DataSourcePanel – API tab with RemoteSourceModal', () => {
  const onDataLoaded = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  it('shows RemoteSourceModal form in API tab with URL input, method radios, Advanced toggle', () => {
    render(<DataSourcePanel onDataLoaded={onDataLoaded} />);
    fireEvent.click(screen.getByRole('button', { name: /API Fetch/i }));
    expect(screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GET/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/POST/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Advanced/i })).toBeInTheDocument();
  });

  it('calls onDataLoaded when remote fetch succeeds', async () => {
    vi.spyOn(fetchRemoteModule, 'fetchRemote').mockResolvedValue([{ col: 1 }]);
    render(<DataSourcePanel onDataLoaded={onDataLoaded} />);
    fireEvent.click(screen.getByRole('button', { name: /API Fetch/i }));
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i),
      { target: { value: 'https://api.test/data' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));
    await waitFor(() => {
      expect(onDataLoaded).toHaveBeenCalledWith([{ col: 1 }]);
    });
  });

  it('renders Paste JSON tab and processes JSON input', async () => {
    const onDataLoaded = vi.fn();
    render(<DataSourcePanel onDataLoaded={onDataLoaded} />);

    const pasteTab = screen.getByRole('button', { name: /Paste JSON/i });
    fireEvent.click(pasteTab);

    const textarea = screen.getByLabelText(/Paste JSON/i);
    fireEvent.change(textarea, { target: { value: '[{"id": 100}]' } });

    const loadBtn = screen.getByRole('button', { name: /Load JSON Data/i });
    fireEvent.click(loadBtn);

    expect(onDataLoaded).toHaveBeenCalledWith([{ id: 100 }]);
  });

  it('supports data path input for JSON file uploads', async () => {
    const onDataLoaded = vi.fn();
    render(<DataSourcePanel onDataLoaded={onDataLoaded} />);

    const pathInput = screen.getByLabelText(/Data Path/i);
    fireEvent.change(pathInput, { target: { value: 'result.items' } });

    const file = new File([JSON.stringify({ result: { items: [{ a: 1 }] } })], 'data.json', { type: 'application/json' });
    const input = screen.getByTestId('file-input');

    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(onDataLoaded).toHaveBeenCalledWith([{ a: 1 }]);
    });
  });
});
