import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PivotControls from './PivotControls.jsx';

describe('PivotControls', () => {
  const mockColumns = ['Category', 'Region', 'Sales'];
  const mockData = [
    { Category: 'Tech', Region: 'North', Sales: 100 },
    { Category: 'Furniture', Region: 'South', Sales: 200 },
  ];
  const mockConfig = {
    rows: ['Category'],
    columns: [],
    measures: ['Sales'],
    filters: {},
    aggregation: 'SUM',
  };

  it('renders available fields zone with field-zone-available class', () => {
    render(
      <PivotControls
        columns={mockColumns}
        data={mockData}
        pivotConfig={mockConfig}
        onConfigChange={() => {}}
      />
    );
    expect(screen.getByText('Filter Fields')).toBeInTheDocument();
    const availableZone = screen.getByTestId('zone-available');
    expect(availableZone).toHaveClass('field-zone-available');
  });

  it('adds a field to filters zone via field popover menu', () => {
    const handleConfigChange = vi.fn();
    render(
      <PivotControls
        columns={mockColumns}
        data={mockData}
        pivotConfig={mockConfig}
        onConfigChange={handleConfigChange}
      />
    );

    // Available field Region
    const regionTag = screen.getByText('Region');
    fireEvent.click(regionTag);

    // Click -> Filters
    const filterOption = screen.getByText('→ Filters');
    fireEvent.click(filterOption);

    expect(handleConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { Region: ['North', 'South'] },
      })
    );
  });

  it('renders filter field tag with selection count and allows toggling popover and options', () => {
    const handleConfigChange = vi.fn();
    const configWithFilter = {
      ...mockConfig,
      filters: { Region: ['North', 'South'] },
    };

    render(
      <PivotControls
        columns={mockColumns}
        data={mockData}
        pivotConfig={configWithFilter}
        onConfigChange={handleConfigChange}
      />
    );

    // Filter tag should display count (2/2)
    const filterTag = screen.getByText(/Region \(2\/2\)/);
    expect(filterTag).toBeInTheDocument();

    // Click filter tag to open popover
    fireEvent.click(filterTag);

    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();

    // Click Clear All
    const clearAllBtn = screen.getByText('Clear All');
    fireEvent.click(clearAllBtn);

    expect(handleConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { Region: [] },
      })
    );
  });

  it('removes a field from filters zone when clicking ✕', () => {
    const handleConfigChange = vi.fn();
    const configWithFilter = {
      ...mockConfig,
      filters: { Region: ['North'] },
    };

    render(
      <PivotControls
        columns={mockColumns}
        data={mockData}
        pivotConfig={configWithFilter}
        onConfigChange={handleConfigChange}
      />
    );

    const filterTag = screen.getByText(/Region \(1\/2\)/);
    const removeBtn = filterTag.querySelector('.remove-btn');
    fireEvent.click(removeBtn);

    expect(handleConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {},
      })
    );
  });

  describe('Drag and Drop field configuration', () => {
    it('supports dragging a field from Available Fields to Rows zone', () => {
      const handleConfigChange = vi.fn();
      render(
        <PivotControls
          columns={['Category', 'Sales']}
          data={mockData}
          pivotConfig={{ rows: [], columns: [], measures: [], filters: {} }}
          onConfigChange={handleConfigChange}
        />
      );

      const categoryTag = screen.getByText('Category');
      fireEvent.dragStart(categoryTag);

      const rowsZone = screen.getByTestId('zone-rows');
      fireEvent.drop(rowsZone);

      expect(handleConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ rows: ['Category'] })
      );
    });

    it('supports dragging a field from Available Fields to Columns zone', () => {
      const handleConfigChange = vi.fn();
      render(
        <PivotControls
          columns={['Category', 'Sales']}
          data={mockData}
          pivotConfig={{ rows: [], columns: [], measures: [], filters: {} }}
          onConfigChange={handleConfigChange}
        />
      );

      const categoryTag = screen.getByText('Category');
      fireEvent.dragStart(categoryTag);

      const columnsZone = screen.getByTestId('zone-columns');
      fireEvent.drop(columnsZone);

      expect(handleConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ columns: ['Category'] })
      );
    });

    it('supports dragging a field from Available Fields to Measures zone', () => {
      const handleConfigChange = vi.fn();
      render(
        <PivotControls
          columns={['Category', 'Sales']}
          data={mockData}
          pivotConfig={{ rows: [], columns: [], measures: [], filters: {} }}
          onConfigChange={handleConfigChange}
        />
      );

      const categoryTag = screen.getByText('Category');
      fireEvent.dragStart(categoryTag);

      const measuresZone = screen.getByTestId('zone-measures');
      fireEvent.drop(measuresZone);

      expect(handleConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ measures: ['Category'] })
      );
    });

    it('supports dragging a field from Rows zone to Available zone', () => {
      const handleConfigChange = vi.fn();
      render(
        <PivotControls
          columns={['Category', 'Sales']}
          data={mockData}
          pivotConfig={{ rows: ['Category'], columns: [], measures: [], filters: {} }}
          onConfigChange={handleConfigChange}
        />
      );

      const categoryTag = screen.getByText('Category');
      fireEvent.dragStart(categoryTag);

      const availableZone = screen.getByTestId('zone-available');
      fireEvent.drop(availableZone);

      expect(handleConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ rows: [] })
      );
    });

    it('supports dragging a field from Rows zone to Columns zone', () => {
      const handleConfigChange = vi.fn();
      render(
        <PivotControls
          columns={['Category', 'Sales']}
          data={mockData}
          pivotConfig={{ rows: ['Category'], columns: [], measures: [], filters: {} }}
          onConfigChange={handleConfigChange}
        />
      );

      const categoryTag = screen.getByText('Category');
      fireEvent.dragStart(categoryTag);

      const columnsZone = screen.getByTestId('zone-columns');
      fireEvent.drop(columnsZone);

      expect(handleConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ rows: [], columns: ['Category'] })
      );
    });

    it('supports re-ordering fields within the same zone by dragging onto another field tag', () => {
      const handleConfigChange = vi.fn();
      render(
        <PivotControls
          columns={['A', 'B', 'C']}
          data={mockData}
          pivotConfig={{ rows: ['A', 'B', 'C'], columns: [], measures: [], filters: {} }}
          onConfigChange={handleConfigChange}
        />
      );

      const tagC = screen.getByText('C');
      const tagA = screen.getByText('A');

      fireEvent.dragStart(tagC);
      fireEvent.drop(tagA);

      expect(handleConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ rows: ['C', 'A', 'B'] })
      );
    });
  });

  it('allows toggling Grand Totals and Subtotals checkboxes', () => {
    const handleConfigChange = vi.fn();
    render(
      <PivotControls
        columns={mockColumns}
        data={mockData}
        pivotConfig={{ ...mockConfig, showGrandTotals: true, showSubTotals: true }}
        onConfigChange={handleConfigChange}
      />
    );

    const grandTotalsCheckbox = screen.getByLabelText('Grand Totals');
    const subtotalsCheckbox = screen.getByLabelText('Subtotals');

    expect(grandTotalsCheckbox).toBeChecked();
    expect(subtotalsCheckbox).toBeChecked();

    fireEvent.click(grandTotalsCheckbox);
    expect(handleConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ showGrandTotals: false })
    );

    fireEvent.click(subtotalsCheckbox);
    expect(handleConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ showSubTotals: false })
    );

    const treeViewCheckbox = screen.getByLabelText('Tree View');
    expect(treeViewCheckbox).toBeChecked();

    fireEvent.click(treeViewCheckbox);
    expect(handleConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ rowHierarchyType: 'grid' })
    );
  });
});

