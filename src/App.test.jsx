import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const { mockVChartInstance, MockVChart } = vi.hoisted(() => {
  const mockVChartInstance = {
    renderSync: vi.fn(),
    updateSpec: vi.fn(),
    release: vi.fn(),
  };
  const MockVChart = vi.fn().mockImplementation(function () {
    return mockVChartInstance;
  });
  return { mockVChartInstance, MockVChart };
});

vi.mock('@visactor/vchart', () => ({
  default: MockVChart,
}));

vi.mock('@visactor/vtable', () => ({
  PivotTable: vi.fn().mockImplementation(() => ({
    release: vi.fn(),
    updateOption: vi.fn(),
  })),
}));

vi.mock('@visactor/react-vtable', () => ({
  PivotTable: React.forwardRef((props, ref) => <div ref={ref} data-testid="mock-pivot-table" />),
}));

import App from './App.jsx';
import { STORAGE_KEY } from './utils/storageHelpers.js';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders empty state initially when no data is loaded', () => {
    render(<App />);
    expect(screen.getByText(/Welcome to Agile Data Pivot/i)).toBeInTheDocument();
    expect(screen.getByText(/Load a dataset using the/i)).toBeInTheDocument();
  });

  it('places PivotView in left pane and ChartPanel + PivotControls in right pane when data is loaded', async () => {
    const { container } = render(<App />);

    const fileBtn = screen.getByRole('button', { name: /File/i });
    fireEvent.click(fileBtn);

    const fileInput = container.querySelector('input[type="file"]');
    const mockFile = new File([JSON.stringify([{ Category: 'A', Sales: 100 }])], 'test.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(container.querySelector('.dashboard-left-pane')).toBeInTheDocument();
    });

    const leftPane = container.querySelector('.dashboard-left-pane');
    const rightPane = container.querySelector('.dashboard-right-pane');

    expect(leftPane.querySelector('.pivot-view-wrapper')).toBeInTheDocument();
    expect(leftPane.querySelector('.pivot-controls')).toBeNull();

    expect(rightPane.querySelector('.chart-panel')).toBeInTheDocument();
    expect(rightPane.querySelector('.pivot-controls')).toBeInTheDocument();
  });

  it('updates document root data-theme attribute when changing theme in MenuBar', () => {
    render(<App />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('default');

    const themeSelect = screen.getByLabelText(/Theme:/i);
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('loads persisted data on mount if present in localStorage', () => {
    const sampleData = [{ Category: 'Tech', Sales: 500 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));

    const { container } = render(<App />);
    expect(container.querySelector('.dashboard-left-pane')).toBeInTheDocument();
  });

  it('clears previous storage and saves new data when new data is loaded', async () => {
    const oldData = [{ Category: 'Old', Sales: 100 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));

    const { container } = render(<App />);
    
    const fileBtn = screen.getByRole('button', { name: /File/i });
    fireEvent.click(fileBtn);

    const fileInput = container.querySelector('input[type="file"]');
    const mockFile = new File([JSON.stringify([{ Category: 'New', Sales: 200 }])], 'new.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      expect(stored.data).toEqual([{ Category: 'New', Sales: 200 }]);
      expect(stored.pivotConfig).toBeDefined();
      expect(stored.changeLog).toHaveLength(1);
      expect(stored.changeLog[0].type).toBe('DATA_LOADED');
    });
  });

  it('purges storage and resets app state when purge button is clicked', async () => {
    const sampleData = [{ Category: 'Tech', Sales: 500 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));

    render(<App />);
    
    const purgeBtn = screen.getByRole('button', { name: /Purge Data/i });
    fireEvent.click(purgeBtn);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/Welcome to Agile Data Pivot/i)).toBeInTheDocument();
  });

  it('propagates raw data changes to pivot view and chart and persists to localStorage', async () => {
    const sampleData = [{ Category: 'Tech', Sales: 500 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));

    const { container } = render(<App />);

    // Switch to Raw Data tab
    const rawDataTab = screen.getByRole('button', { name: /Raw Data/i });
    fireEvent.click(rawDataTab);

    // Edit cell input (Sales from 500 to 999)
    const salesInput = container.querySelector('#cell-0-Sales');
    expect(salesInput).toBeInTheDocument();
    fireEvent.change(salesInput, { target: { value: '999' } });

    // Verify localStorage persistence
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.data[0].Sales).toBe(999);

    // Switch back to Analysis tab
    const analysisTab = screen.getByRole('button', { name: /Analysis/i });
    fireEvent.click(analysisTab);

    // Check dashboard panes rendered with updated data
    expect(container.querySelector('.dashboard-left-pane')).toBeInTheDocument();
  });

  it('loads persisted data, pivotConfig, and changeLog on mount', () => {
    const persistedPayload = {
      version: 1,
      data: [{ Category: 'Gadgets', Sales: 300 }],
      pivotConfig: {
        rows: ['Category'],
        columns: [],
        measures: ['Sales'],
        filters: {},
        aggregation: 'SUM',
      },
      changeLog: [{
        id: 'log_1',
        timestamp: 1000,
        type: 'DATA_LOADED',
        summary: 'Loaded dataset (1 rows)',
      }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedPayload));

    const { container } = render(<App />);
    expect(container.querySelector('.dashboard-left-pane')).toBeInTheDocument();
  });

  it('persists pivotConfig and changeLog when cell edit occurs in DataEditor', async () => {
    const sampleData = [{ Category: 'Tech', Sales: 500 }];
    const payload = {
      version: 1,
      data: sampleData,
      pivotConfig: { rows: ['Category'], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: [{ id: 'log_1', timestamp: 1000, type: 'DATA_LOADED', summary: 'Loaded dataset' }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const { container } = render(<App />);

    // Switch to Raw Data tab
    const rawDataTab = screen.getByRole('button', { name: /Raw Data/i });
    fireEvent.click(rawDataTab);

    // Edit cell input (Sales from 500 to 750)
    const salesInput = container.querySelector('#cell-0-Sales');
    fireEvent.focus(salesInput);
    fireEvent.change(salesInput, { target: { value: '750' } });
    fireEvent.blur(salesInput);

    // Verify localStorage persistence contains updated data and changeLog entry
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.data[0].Sales).toBe(750);
    expect(stored.changeLog.length).toBe(2);
    expect(stored.changeLog[1].type).toBe('CELL_EDIT');
    expect(stored.changeLog[1].dataSnapshot[0].Sales).toBe(750);
  });

  it('persists cell edit highlight when switching between tabs and restores via Reverse button', async () => {
    const initialData = [{ Category: 'Tech', Sales: 100 }];
    const payload = {
      version: 1,
      data: initialData,
      pivotConfig: { rows: ['Category'], columns: [], measures: [], filters: {}, aggregation: 'SUM' },
      changeLog: [{ id: 'log_init', timestamp: 1000, type: 'DATA_LOADED', summary: 'Loaded dataset', dataSnapshot: initialData }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const { container } = render(<App />);

    // Switch to Raw Data tab
    const rawDataTab = screen.getByRole('button', { name: /Raw Data/i });
    fireEvent.click(rawDataTab);

    // Perform cell edit (Sales 100 -> 300)
    let salesInput = container.querySelector('#cell-0-Sales');
    fireEvent.focus(salesInput);
    fireEvent.change(salesInput, { target: { value: '300' } });
    fireEvent.blur(salesInput);

    salesInput = container.querySelector('#cell-0-Sales');
    expect(salesInput).toHaveClass('cell-edited');

    // Switch to Analysis tab
    const analysisTab = screen.getByRole('button', { name: /Analysis/i });
    fireEvent.click(analysisTab);

    // Switch back to Raw Data tab
    fireEvent.click(rawDataTab);

    // Verify cell STILL has cell-edited class!
    salesInput = container.querySelector('#cell-0-Sales');
    expect(salesInput).toHaveClass('cell-edited');

    // Open Change Log modal from header
    const logModalBtn = screen.getByRole('button', { name: /📜 Change Log \(2\)/i });
    fireEvent.click(logModalBtn);

    const reverseBtns = screen.getAllByRole('button', { name: /Reverse/i });
    expect(reverseBtns).toHaveLength(2);

    // Click Reverse to log_init (index 1 in reverse list)
    fireEvent.click(reverseBtns[1]);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.data[0].Sales).toBe(100);
    expect(stored.changeLog.length).toBe(1);

    // Verify cell highlight is now removed!
    salesInput = container.querySelector('#cell-0-Sales');
    expect(salesInput).not.toHaveClass('cell-edited');
  });
});



