import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MenuBar from './MenuBar.jsx';

describe('MenuBar', () => {
  const defaultProps = {
    activeView: 'analysis',
    onViewChange: vi.fn(),
    onFetched: vi.fn(),
    onLocalFileLoaded: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders brand title, navigation tabs, and import data button', () => {
    const { container } = render(<MenuBar {...defaultProps} />);

    expect(screen.getByText(/SwiftPivot/i)).toBeInTheDocument();
    expect(screen.getByText(/Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Raw Data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Data/i })).toBeInTheDocument();
    expect(container.querySelector('.menu-left-section')).toBeInTheDocument();
    expect(container.querySelector('.menu-divider')).toBeInTheDocument();
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

  it('toggles import dropdown menu and handles file upload via Local File option', async () => {
    const handleLocalFileLoaded = vi.fn();
    render(<MenuBar {...defaultProps} onLocalFileLoaded={handleLocalFileLoaded} />);

    const importMenuBtn = screen.getByRole('button', { name: /Import Data/i });
    expect(screen.queryByText(/Local File \(CSV \/ JSON\)/i)).not.toBeInTheDocument();

    fireEvent.click(importMenuBtn);
    expect(screen.getByText(/Local File \(CSV \/ JSON\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Remote URL \(API\)/i)).toBeInTheDocument();

    const hiddenInput = document.querySelector('input[type="file"]');
    expect(hiddenInput).toBeInTheDocument();

    const csvContent = 'Name,Sales\nAlice,100\nBob,200';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });

    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(csvContent),
    });

    fireEvent.change(hiddenInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleLocalFileLoaded).toHaveBeenCalledWith([
        { Name: 'Alice', Sales: 100 },
        { Name: 'Bob', Sales: 200 },
      ]);
    });
  });

  it('does not render Refresh button when onRefresh is not provided', () => {
    render(<MenuBar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /Refresh/i })).not.toBeInTheDocument();
  });

  it('renders Refresh button when onRefresh prop is provided', () => {
    render(<MenuBar {...defaultProps} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });

  it('calls onRefresh when Refresh button is clicked', async () => {
    const handleRefresh = vi.fn().mockResolvedValue(undefined);
    render(<MenuBar {...defaultProps} onRefresh={handleRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on Refresh button while isRefreshing=true', () => {
    render(<MenuBar {...defaultProps} onRefresh={vi.fn()} isRefreshing={true} />);
    const btn = screen.getByRole('button', { name: /Refreshing/i });
    expect(btn).toBeDisabled();
  });

  it('shows refreshError below Refresh button when provided', () => {
    render(
      <MenuBar
        {...defaultProps}
        onRefresh={vi.fn()}
        refreshError="HTTP 503: Service Unavailable"
      />,
    );
    expect(screen.getByText(/HTTP 503: Service Unavailable/i)).toBeInTheDocument();
  });

  it('opens RemoteSourceModal via "Remote URL (API)" dropdown and calls onFetched on success', async () => {
    const handleFetched = vi.fn();
    render(<MenuBar {...defaultProps} onFetched={handleFetched} />);

    fireEvent.click(screen.getByRole('button', { name: /Import Data/i }));

    const remoteBtn = screen.getByText(/Remote URL \(API\)/i);
    expect(remoteBtn).toBeVisible();
    fireEvent.click(remoteBtn);

    expect(screen.getByText(/Remote Data Source/i)).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText(/https:\/\/api\.example\.com\/data/i),
      { target: { value: 'https://api.test/records' } },
    );

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', score: '99' }],
    });

    fireEvent.click(screen.getByRole('button', { name: /Fetch Data/i }));

    await waitFor(() => {
      expect(handleFetched).toHaveBeenCalledWith(
        [{ id: 1, score: 99 }],
        expect.objectContaining({ url: 'https://api.test/records', method: 'GET' }),
      );
    });

    fetchSpy.mockRestore();
  });

  it('provides hidden helper buttons for backwards compatibility with legacy tests', () => {
    render(<MenuBar {...defaultProps} />);

    const fileHelper = screen.getByRole('button', { name: 'File' });
    expect(fileHelper).toBeInTheDocument();

    const fetchHelper = screen.getByRole('button', { name: 'Fetch API' });
    expect(fetchHelper).toBeInTheDocument();
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

  it('toggles custom theme dropdown menu and selects a theme via dropdown items', () => {
    const handleThemeChange = vi.fn();
    render(<MenuBar {...defaultProps} vtableTheme="default" onThemeChange={handleThemeChange} />);

    // Custom button shows active theme icon and label
    const themeBtn = screen.getByRole('button', { name: /Default/i });
    expect(themeBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dark/i })).not.toBeInTheDocument();

    // Open dropdown
    fireEvent.click(themeBtn);
    const darkOption = screen.getByRole('button', { name: /Dark/i });
    const simplifyOption = screen.getByRole('button', { name: /Simplify/i });
    expect(darkOption).toBeInTheDocument();
    expect(simplifyOption).toBeInTheDocument();

    // Select Dark theme from dropdown
    fireEvent.click(darkOption);
    expect(handleThemeChange).toHaveBeenCalledWith('dark');
    expect(screen.queryByRole('button', { name: /Simplify/i })).not.toBeInTheDocument();
  });

  it('closes custom theme dropdown when clicking outside', () => {
    render(<MenuBar {...defaultProps} />);
    const themeBtn = screen.getByRole('button', { name: /Default/i });

    fireEvent.click(themeBtn);
    expect(screen.getByRole('button', { name: /Dark/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: /Dark/i })).not.toBeInTheDocument();
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

  it('renders privacy badge container with badge text and tooltip detailing security guarantees', () => {
    const { container } = render(<MenuBar {...defaultProps} />);

    const badgeContainer = container.querySelector('.privacy-badge-container');
    expect(badgeContainer).toBeInTheDocument();

    const badge = container.querySelector('.privacy-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Secure Sandbox/i);

    const tooltip = container.querySelector('.privacy-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/100% Client-Side/i);
    expect(tooltip).toHaveTextContent(/All parsing, aggregation, and pivoting is done inside your local browser tab/i);
    expect(tooltip).toHaveTextContent(/No Server Uploads/i);
    expect(tooltip).toHaveTextContent(/Your dataset is never sent to any external server or backend/i);
    expect(tooltip).toHaveTextContent(/Local Sandbox/i);
    expect(tooltip).toHaveTextContent(/Data is stored temporarily in local memory and can be cleared immediately using the Purge \(trash\) button/i);
  });
});


