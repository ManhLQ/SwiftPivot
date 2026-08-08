import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MenuBar from './MenuBar.jsx';

describe('MenuBar', () => {
  const defaultProps = {
    activeView: 'analysis',
    onViewChange: vi.fn(),
    onDataLoaded: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand title, navigation tabs, file menu, and api fetch button', () => {
    render(<MenuBar {...defaultProps} />);

    expect(screen.getByText(/Agile Data Pivot/i)).toBeInTheDocument();
    expect(screen.getByText(/Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Raw Data/i)).toBeInTheDocument();
    expect(screen.getByText(/File/i)).toBeInTheDocument();
    expect(screen.getByText(/Fetch API/i)).toBeInTheDocument();
  });

  it('highlights the active tab with the active class', () => {
    const { rerender } = render(<MenuBar {...defaultProps} activeView="analysis" />);

    const analysisTab = screen.getByRole('button', { name: /Analysis/i });
    const rawTab = screen.getByRole('button', { name: /Raw Data/i });

    expect(analysisTab).toHaveClass('active');
    expect(rawTab).not.toHaveClass('active');

    rerender(<MenuBar {...defaultProps} activeView="raw" />);
    expect(analysisTab).not.toHaveClass('active');
    expect(rawTab).toHaveClass('active');
  });

  it('triggers onViewChange when clicking navigation tabs', () => {
    const handleViewChange = vi.fn();
    render(<MenuBar {...defaultProps} onViewChange={handleViewChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Raw Data/i }));
    expect(handleViewChange).toHaveBeenCalledWith('raw');

    fireEvent.click(screen.getByRole('button', { name: /Analysis/i }));
    expect(handleViewChange).toHaveBeenCalledWith('analysis');
  });

  it('toggles file dropdown menu and handles file upload', async () => {
    const handleDataLoaded = vi.fn();
    render(<MenuBar {...defaultProps} onDataLoaded={handleDataLoaded} />);

    const fileMenuBtn = screen.getByRole('button', { name: /File/i });
    expect(screen.queryByText(/Upload CSV \/ JSON/i)).not.toBeInTheDocument();

    fireEvent.click(fileMenuBtn);
    expect(screen.getByText(/Upload CSV \/ JSON/i)).toBeInTheDocument();

    const uploadOption = screen.getByText(/Upload CSV \/ JSON/i);
    const hiddenInput = document.querySelector('input[type="file"]');
    expect(hiddenInput).toBeInTheDocument();

    const csvContent = 'Name,Sales\nAlice,100\nBob,200';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });

    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(csvContent),
    });

    fireEvent.change(hiddenInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleDataLoaded).toHaveBeenCalledWith([
        { Name: 'Alice', Sales: 100 },
        { Name: 'Bob', Sales: 200 },
      ]);
    });
  });

  it('opens API Fetch modal, fetches data with credentials: include, and calls onDataLoaded', async () => {
    const handleDataLoaded = vi.fn();
    render(<MenuBar {...defaultProps} onDataLoaded={handleDataLoaded} />);

    const fetchBtn = screen.getByRole('button', { name: /Fetch API/i });
    fireEvent.click(fetchBtn);

    expect(screen.getByText(/Fetch Data from API/i)).toBeInTheDocument();
    const urlInput = screen.getByPlaceholderText(/https:\/\/api.example.com\/data/i);

    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/items' } });

    const mockResponse = [
      { id: '1', price: '50' },
      { id: '2', price: '100' },
    ];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const submitBtn = screen.getByRole('button', { name: 'Fetch Data' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/items', {
        credentials: 'include',
      });
      expect(handleDataLoaded).toHaveBeenCalledWith([
        { id: 1, price: 50 },
        { id: 2, price: 100 },
      ]);
    });

    fetchSpy.mockRestore();
  });

  it('renders theme selector with default value and handles theme change', () => {
    const handleThemeChange = vi.fn();
    render(<MenuBar {...defaultProps} vtableTheme="default" onThemeChange={handleThemeChange} />);

    const themeSelect = screen.getByLabelText(/Theme:/i);
    expect(themeSelect).toHaveValue('default');

    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    expect(handleThemeChange).toHaveBeenCalledWith('dark');
  });

  it('includes only default, dark, and simplify themes in selector options', () => {
    render(<MenuBar {...defaultProps} />);
    const options = screen.getAllByRole('option');
    const optionValues = options.map((opt) => opt.value);
    expect(optionValues).toEqual(['default', 'dark', 'simplify']);
    expect(screen.queryByText('Arco')).not.toBeInTheDocument();
    expect(screen.queryByText('Bright')).not.toBeInTheDocument();
  });

  it('renders Purge button when dataset exists and calls onPurgeData on click', () => {
    const handlePurge = vi.fn();
    render(
      <MenuBar
        {...defaultProps}
        hasData={true}
        onPurgeData={handlePurge}
      />
    );

    const purgeBtn = screen.getByRole('button', { name: /Purge Data/i });
    expect(purgeBtn).toBeInTheDocument();

    fireEvent.click(purgeBtn);
    expect(handlePurge).toHaveBeenCalledTimes(1);
  });

  it('does not display Purge button when dataset is empty', () => {
    render(
      <MenuBar
        {...defaultProps}
        hasData={false}
        onPurgeData={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /Purge Data/i })).not.toBeInTheDocument();
  });

  it('renders Change Log modal with Reverse buttons and calls onRevertToLog when clicked', () => {
    const onRevertToLog = vi.fn();
    const changeLog = [
      { id: 'log_1', timestamp: 1000, type: 'DATA_LOADED', summary: 'Loaded 50 rows' },
      { id: 'log_2', timestamp: 2000, type: 'CELL_EDIT', summary: 'Row 1 [Sales]: "100" ➔ "200"' },
    ];
    render(
      <MenuBar
        {...defaultProps}
        hasData={true}
        changeLog={changeLog}
        onRevertToLog={onRevertToLog}
      />
    );

    const logBtn = screen.getByRole('button', { name: /📜 Change Log \(2\)/i });
    expect(logBtn).toBeInTheDocument();

    fireEvent.click(logBtn);

    expect(screen.getByText(/Audit Change Log \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('Row 1 [Sales]: "100" ➔ "200"')).toBeInTheDocument();

    const reverseButtons = screen.getAllByRole('button', { name: /Reverse/i });
    expect(reverseButtons).toHaveLength(2);

    // Most recent item (log_2 at index 0) should have Reverse disabled
    expect(reverseButtons[0]).toBeDisabled();

    // Older item (log_1 at index 1) should have Reverse enabled
    expect(reverseButtons[1]).not.toBeDisabled();

    fireEvent.click(reverseButtons[1]);
    expect(onRevertToLog).toHaveBeenCalledWith('log_1');
  });
});

