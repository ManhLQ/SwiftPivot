import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RemoteSourceModal from './RemoteSourceModal.jsx';
import * as fetchRemoteModule from '../utils/fetchRemote.js';

describe('RemoteSourceModal', () => {
  const onFetched = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders URL input, GET/POST radios, and Fetch/Cancel buttons', () => {
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    expect(screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/GET/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/POST/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fetch Data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('hides advanced fields by default and shows them on toggle', () => {
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    expect(screen.queryByLabelText(/Headers/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Response Path/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Advanced/i }));

    expect(screen.getByLabelText(/Headers/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Response Path/i)).toBeInTheDocument();
  });

  it('calls onFetched with rows AND config on success', async () => {
    const rows = [{ id: 1, name: 'Alice' }];
    vi.spyOn(fetchRemoteModule, 'fetchRemote').mockResolvedValue(rows);

    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i),
      { target: { value: 'https://api.test/items' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));

    await waitFor(() => {
      expect(onFetched).toHaveBeenCalledWith(rows, {
        url: 'https://api.test/items',
        method: 'GET',
        headers: {},
        body: undefined,
        responsePath: '',
      });
    });
  });

  it('passes POST config including headers, body, and responsePath to onFetched', async () => {
    vi.spyOn(fetchRemoteModule, 'fetchRemote').mockResolvedValue([{ x: 1 }]);

    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i),
      { target: { value: 'https://api.test/query' } },
    );
    fireEvent.click(screen.getByLabelText(/POST/i));
    fireEvent.click(screen.getByRole('button', { name: /Advanced/i }));
    fireEvent.change(screen.getByLabelText(/Headers/i), {
      target: { value: '{"Authorization":"Bearer T"}' },
    });
    fireEvent.change(screen.getByLabelText(/Request Body/i), {
      target: { value: '{"filter":"active"}' },
    });
    fireEvent.change(screen.getByLabelText(/Response Path/i), {
      target: { value: 'data.items' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));

    await waitFor(() => {
      expect(onFetched).toHaveBeenCalledWith([{ x: 1 }], {
        url: 'https://api.test/query',
        method: 'POST',
        headers: { Authorization: 'Bearer T' },
        body: { filter: 'active' },
        responsePath: 'data.items',
      });
    });
  });

  it('shows inline error when fetchRemote throws', async () => {
    vi.spyOn(fetchRemoteModule, 'fetchRemote').mockRejectedValue(
      new Error('HTTP 401: Unauthorized'),
    );
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i),
      { target: { value: 'https://api.test/x' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('HTTP 401: Unauthorized');
      expect(onFetched).not.toHaveBeenCalled();
    });
  });

  it('shows validation error when URL is empty', () => {
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid URL/i);
  });

  it('shows validation error when Headers field is invalid JSON', () => {
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i),
      { target: { value: 'https://api.test/x' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Advanced/i }));
    fireEvent.change(screen.getByLabelText(/Headers/i), {
      target: { value: 'bad json' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Headers must be valid JSON/i);
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders inline form (no overlay) when embedded=true', () => {
    const { container } = render(
      <RemoteSourceModal onFetched={onFetched} onClose={onClose} embedded />,
    );
    expect(container.querySelector('.modal-overlay')).not.toBeInTheDocument();
    expect(container.querySelector('.remote-source-form')).toBeInTheDocument();
  });

  it('does not propagate modal overlay click when clicking form area', () => {
    render(<RemoteSourceModal onFetched={onFetched} onClose={onClose} />);
    // Click modal content area — onClose should not be called
    const content = document.querySelector('.modal-content');
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });
});
