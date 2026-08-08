import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@visactor/react-vtable', () => ({
  PivotTable: React.forwardRef(({ option, height }, ref) => (
    <div ref={ref} data-testid="mock-pivot-table" data-theme-prop={option?.theme} data-height-prop={height} />
  )),
}));

import PivotView from './PivotView.jsx';

describe('PivotView', () => {
  const sampleData = [{ Category: 'A', Sales: 100 }];
  const sampleConfig = { rows: ['Category'], columns: [], measures: ['Sales'], filters: {}, aggregation: 'SUM' };

  it('renders prompt when no measures are selected', () => {
    render(<PivotView data={sampleData} rawDataLength={1} pivotConfig={{ rows: [], columns: [], measures: [], aggregation: 'SUM' }} />);
    expect(screen.getByText(/Assign at least one measure field to see the pivot table/i)).toBeInTheDocument();
  });

  it('renders PivotTable with theme passed from props and height set to 100%', () => {
    render(
      <PivotView
        data={sampleData}
        rawDataLength={1}
        pivotConfig={sampleConfig}
        vtableTheme="simplify"
      />
    );
    const tableEl = screen.getByTestId('mock-pivot-table');
    expect(tableEl).toBeInTheDocument();
    expect(tableEl).toHaveAttribute('data-theme-prop', 'simplify');
    expect(tableEl).toHaveAttribute('data-height-prop', '100%');
  });

  it('updates height prop when ResizeObserver triggers', () => {
    let observerCallback;
    class MockResizeObserver {
      constructor(callback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    render(
      <PivotView
        data={sampleData}
        rawDataLength={1}
        pivotConfig={sampleConfig}
      />
    );

    const tableEl = screen.getByTestId('mock-pivot-table');
    expect(tableEl).toHaveAttribute('data-height-prop', '100%');

    if (observerCallback) {
      act(() => {
        observerCallback([{ contentRect: { height: 650 } }]);
      });
    }

    expect(screen.getByTestId('mock-pivot-table')).toHaveAttribute('data-height-prop', '648');
    vi.unstubAllGlobals();
  });
});
