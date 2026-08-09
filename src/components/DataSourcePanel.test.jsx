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
});
