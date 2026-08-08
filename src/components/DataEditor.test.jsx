import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataEditor from './DataEditor.jsx';

describe('DataEditor Column Filtering and Cell Editing', () => {
  const sampleData = [
    { Name: 'Alice', Region: 'North', Sales: 100 },
    { Name: 'Bob', Region: 'South', Sales: 200 },
    { Name: 'Charlie', Region: 'North', Sales: 150 },
  ];

  it('renders column header filter inputs and filters rows by typed column text', () => {
    render(<DataEditor data={sampleData} onDataChange={() => {}} />);

    // Filter input for Region
    const regionFilterInput = screen.getByPlaceholderText('Filter Region...');
    expect(regionFilterInput).toBeInTheDocument();

    // Type "North" in Region filter input
    fireEvent.change(regionFilterInput, { target: { value: 'North' } });

    // Alice and Charlie should be visible, Bob filtered out
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Charlie')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bob')).not.toBeInTheDocument();

    // Stats badge should indicate filtered count
    expect(screen.getByText(/Showing 2 of 3 rows × 3 columns/i)).toBeInTheDocument();
  });

  it('shows Clear Column Filters button when filter is active and clears filters when clicked', () => {
    render(<DataEditor data={sampleData} onDataChange={() => {}} />);

    expect(screen.queryByRole('button', { name: /Clear Column Filters/i })).not.toBeInTheDocument();

    const regionFilterInput = screen.getByPlaceholderText('Filter Region...');
    fireEvent.change(regionFilterInput, { target: { value: 'South' } });

    const clearBtn = screen.getByRole('button', { name: /Clear Column Filters/i });
    expect(clearBtn).toBeInTheDocument();

    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();

    fireEvent.click(clearBtn);

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Charlie')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clear Column Filters/i })).not.toBeInTheDocument();
  });

  it('preserves cell editing mapping back to originalIndex when filtered', () => {
    const handleDataChange = vi.fn();
    render(<DataEditor data={sampleData} onDataChange={handleDataChange} />);

    // Filter to only show Charlie (row index 2 in sampleData)
    const nameFilterInput = screen.getByPlaceholderText('Filter Name...');
    fireEvent.change(nameFilterInput, { target: { value: 'Charlie' } });

    // Edit Charlie's Sales cell
    const charlieSalesInput = screen.getByDisplayValue('150');
    fireEvent.change(charlieSalesInput, { target: { value: '999' } });

    expect(handleDataChange).toHaveBeenCalledWith(
      [
        { Name: 'Alice', Region: 'North', Sales: 100 },
        { Name: 'Bob', Region: 'South', Sales: 200 },
        { Name: 'Charlie', Region: 'North', Sales: 999, _isEdited: true },
      ]
    );
  });

  it('opens dropdown filter popover when clicking filter button and filters by checked values', () => {
    render(<DataEditor data={sampleData} onDataChange={() => {}} />);
    const filterBtn = screen.getByTestId('filter-btn-Region');
    fireEvent.click(filterBtn);

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();

    // Uncheck 'South'
    const southCheckbox = screen.getByLabelText('South');
    fireEvent.click(southCheckbox);

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bob')).not.toBeInTheDocument();

    // Click 'Clear All'
    const clearAllBtn = screen.getByText('Clear All');
    fireEvent.click(clearAllBtn);
    expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bob')).not.toBeInTheDocument();

    // Click 'Select All'
    const selectAllBtn = screen.getByText('Select All');
    fireEvent.click(selectAllBtn);
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
  });

  it('normalizes null/undefined cell values as (Blank) and filters them correctly', () => {
    const dataWithBlank = [
      { Name: 'Alice', Region: 'North' },
      { Name: 'Bob', Region: null },
    ];
    render(<DataEditor data={dataWithBlank} onDataChange={() => {}} />);
    const filterBtn = screen.getByTestId('filter-btn-Region');
    fireEvent.click(filterBtn);

    const blankCheckbox = screen.getByLabelText('(Blank)');
    expect(blankCheckbox).toBeInTheDocument();
    expect(blankCheckbox).toBeChecked();

    // Uncheck (Blank)
    fireEvent.click(blankCheckbox);
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bob')).not.toBeInTheDocument();
  });

  it('cleans up columnValueFilters state when all values are toggled back on', () => {
    render(<DataEditor data={sampleData} onDataChange={() => {}} />);
    const filterBtn = screen.getByTestId('filter-btn-Region');
    fireEvent.click(filterBtn);

    const southCheckbox = screen.getByLabelText('South');
    // Uncheck South -> filter active
    fireEvent.click(southCheckbox);
    expect(screen.getByRole('button', { name: /Clear Column Filters/i })).toBeInTheDocument();
    expect(filterBtn).toHaveClass('active');

    // Re-check South -> all values selected -> filter inactive
    fireEvent.click(southCheckbox);
    expect(screen.queryByRole('button', { name: /Clear Column Filters/i })).not.toBeInTheDocument();
    expect(filterBtn).not.toHaveClass('active');
  });

  it('renders data-editor-container and table-scroll-wrapper for 100vh layout fitting', () => {
    const { container } = render(<DataEditor data={sampleData} onDataChange={() => {}} />);
    const mainContainer = container.querySelector('.data-editor-container');
    const scrollWrapper = container.querySelector('.table-scroll-wrapper');
    expect(mainContainer).toBeInTheDocument();
    expect(scrollWrapper).toBeInTheDocument();
  });

  it('highlights edited cell with red text class when comparing against originalData', () => {
    const originalData = [
      { Name: 'Alice', Sales: 100 },
      { Name: 'Bob', Sales: 200 },
    ];
    const editedData = [
      { Name: 'Alice', Sales: 150, _isEdited: true },
      { Name: 'Bob', Sales: 200 },
    ];
    render(
      <DataEditor data={editedData} originalData={originalData} onDataChange={() => {}} />
    );

    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();

    const editedInput = screen.getByDisplayValue('150');
    expect(editedInput).toHaveClass('cell-edited');

    const uneditedInput = screen.getByDisplayValue('200');
    expect(uneditedInput).not.toHaveClass('cell-edited');
  });

  it('calls onDataChange with newData and changeEvent object when cell edit is committed on blur', () => {
    const handleDataChange = vi.fn();
    render(<DataEditor data={sampleData} onDataChange={handleDataChange} />);

    const aliceSalesInput = screen.getByDisplayValue('100');
    fireEvent.focus(aliceSalesInput);
    fireEvent.change(aliceSalesInput, { target: { value: '250' } });
    fireEvent.blur(aliceSalesInput);

    expect(handleDataChange).toHaveBeenCalledTimes(2);
    const [newData, changeEvent] = handleDataChange.mock.calls[1];
    expect(newData[0].Sales).toBe(250);
    expect(changeEvent).toBeDefined();
    expect(changeEvent.type).toBe('CELL_EDIT');
    expect(changeEvent.rowIndex).toBe(0);
    expect(changeEvent.column).toBe('Sales');
    expect(changeEvent.oldValue).toBe(100);
    expect(changeEvent.newValue).toBe(250);
    expect(changeEvent.summary).toBe('Row 1 [Sales]: "100" ➔ "250"');
    expect(changeEvent.id).toMatch(/^log_\d+_[a-z0-9]+$/);
    expect(typeof changeEvent.timestamp).toBe('number');
  });

  it('emits changeEvent only on blur/commit when value actually changed, debouncing keystrokes', () => {
    const handleDataChange = vi.fn();
    render(<DataEditor data={sampleData} onDataChange={handleDataChange} />);

    const aliceSalesInput = screen.getByDisplayValue('100');
    fireEvent.focus(aliceSalesInput);

    // Simulate typing keystrokes
    fireEvent.change(aliceSalesInput, { target: { value: '2' } });
    fireEvent.change(aliceSalesInput, { target: { value: '25' } });
    fireEvent.change(aliceSalesInput, { target: { value: '250' } });

    // Live typing should call onDataChange with newData but without changeEvent
    expect(handleDataChange).toHaveBeenCalledTimes(3);
    expect(handleDataChange.mock.calls[0][1]).toBeUndefined();
    expect(handleDataChange.mock.calls[1][1]).toBeUndefined();
    expect(handleDataChange.mock.calls[2][1]).toBeUndefined();

    // Trigger blur
    fireEvent.blur(aliceSalesInput);

    // Should call onDataChange again with changeEvent
    expect(handleDataChange).toHaveBeenCalledTimes(4);
    const [finalData, changeEvent] = handleDataChange.mock.calls[3];
    expect(finalData[0].Sales).toBe(250);
    expect(changeEvent).toBeDefined();
    expect(changeEvent.type).toBe('CELL_EDIT');
    expect(changeEvent.rowIndex).toBe(0);
    expect(changeEvent.column).toBe('Sales');
    expect(changeEvent.oldValue).toBe(100);
    expect(changeEvent.newValue).toBe(250);
    expect(changeEvent.summary).toBe('Row 1 [Sales]: "100" ➔ "250"');
  });

  it('emits changeEvent on Enter keydown and does not duplicate on subsequent blur', () => {
    const handleDataChange = vi.fn();
    render(<DataEditor data={sampleData} onDataChange={handleDataChange} />);

    const aliceSalesInput = screen.getByDisplayValue('100');
    fireEvent.focus(aliceSalesInput);
    fireEvent.change(aliceSalesInput, { target: { value: '300' } });

    // Press Enter
    fireEvent.keyDown(aliceSalesInput, { key: 'Enter' });

    expect(handleDataChange).toHaveBeenCalledTimes(2);
    const [, changeEvent] = handleDataChange.mock.calls[1];
    expect(changeEvent).toBeDefined();
    expect(changeEvent.newValue).toBe(300);

    // Subsequent blur should not emit another changeEvent
    fireEvent.blur(aliceSalesInput);
    expect(handleDataChange).toHaveBeenCalledTimes(2);
  });

  it('does not emit changeEvent on blur if value did not change', () => {
    const handleDataChange = vi.fn();
    render(<DataEditor data={sampleData} onDataChange={handleDataChange} />);

    const aliceSalesInput = screen.getByDisplayValue('100');
    fireEvent.focus(aliceSalesInput);
    fireEvent.blur(aliceSalesInput);

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('verifies Change Log button and drawer are removed from DataEditor', () => {
    render(<DataEditor data={sampleData} onDataChange={() => {}} />);

    expect(screen.queryByRole('button', { name: /Change Log/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('change-log-drawer')).not.toBeInTheDocument();
  });
});




