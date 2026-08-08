import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import ChartPanel from './ChartPanel.jsx';

describe('ChartPanel', () => {
  const sampleData = [
    { Category: 'Electronics', Sales: 100 },
    { Category: 'Clothing', Sales: 300 },
  ];

  const pivotConfig = {
    rows: ['Category'],
    columns: [],
    measures: ['Sales'],
    aggregation: 'SUM',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when data or config is missing', () => {
    render(<ChartPanel data={[]} rawDataLength={0} pivotConfig={{ rows: [], columns: [], measures: [], aggregation: 'SUM' }} />);
    expect(screen.getByText(/Assign at least one row field and one measure/i)).toBeInTheDocument();
  });

  it('renders active filter empty message when filtered data is empty', () => {
    render(<ChartPanel data={[]} rawDataLength={10} pivotConfig={pivotConfig} />);
    expect(screen.getByText(/No data matches active filters/i)).toBeInTheDocument();
  });

  it('initializes VChart with bar chart spec by default', () => {
    render(<ChartPanel data={sampleData} rawDataLength={2} pivotConfig={pivotConfig} />);
    expect(MockVChart).toHaveBeenCalledTimes(1);
    const spec = MockVChart.mock.calls[0][0];
    expect(spec.type).toBe('bar');
  });

  it('updates VChart spec to pie chart with value and percentage label formatting when Pie tab is clicked', () => {
    render(<ChartPanel data={sampleData} rawDataLength={2} pivotConfig={pivotConfig} />);
    
    const pieButton = screen.getByRole('button', { name: 'Pie' });
    fireEvent.click(pieButton);

    const pieSpec = MockVChart.mock.calls.length > 1 
      ? MockVChart.mock.calls[1][0]
      : mockVChartInstance.updateSpec.mock.calls[0][0];
    
    expect(pieSpec.type).toBe('pie');
    expect(pieSpec.label).toBeDefined();
    expect(pieSpec.label.visible).toBe(true);
    expect(pieSpec.label.style.fontSize).toBe(11);
    expect(typeof pieSpec.label.formatMethod).toBe('function');

    // Test label formatMethod with percent
    const formattedWithPercent = pieSpec.label.formatMethod('100', { Category: 'Electronics', Sales: 100, percent: 0.25 });
    expect(formattedWithPercent).toBe('Electronics: 100 (25.0%)');

    // Test label formatMethod without percent
    const formattedWithoutPercent = pieSpec.label.formatMethod('100', { Category: 'Electronics', Sales: 100 });
    expect(formattedWithoutPercent).toBe('Electronics: 100');
  });
});
