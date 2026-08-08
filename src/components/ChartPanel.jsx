import React, { useState, useMemo, useRef, useEffect } from 'react';
import VChart from '@visactor/vchart';
import './ChartPanel.css';

const CHART_TYPES = [
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
  { key: 'pie', label: 'Pie' },
  { key: 'area', label: 'Area' },
];

const DARK_THEME = {
  background: 'transparent',
  fontFamily: "'Inter', sans-serif",
  colorScheme: {
    default: ['#6c63ff', '#a78bfa', '#51cf66', '#ff6b6b', '#ffd43b', '#4ecdc4', '#ff6b9d'],
  },
};

function buildChartSpec(data, pivotConfig, chartType) {
  const { rows, measures, aggregation } = pivotConfig;

  if (!data || data.length === 0 || measures.length === 0 || rows.length === 0) {
    return null;
  }

  const categoryField = rows[0];
  const valueField = measures[0];

  // Aggregate data by the category field
  const aggregated = {};
  for (const row of data) {
    const key = String(row[categoryField] ?? '(empty)');
    if (!aggregated[key]) {
      aggregated[key] = { values: [], count: 0 };
    }
    const val = typeof row[valueField] === 'number' ? row[valueField] : 0;
    aggregated[key].values.push(val);
    aggregated[key].count += 1;
  }

  const chartData = Object.entries(aggregated).map(([key, { values, count }]) => {
    let aggValue;
    const sum = values.reduce((a, b) => a + b, 0);
    switch (aggregation) {
      case 'SUM':
        aggValue = sum;
        break;
      case 'COUNT':
        aggValue = count;
        break;
      case 'AVG':
        aggValue = count > 0 ? sum / count : 0;
        break;
      case 'MIN': {
        let min = Infinity;
        for (let i = 0; i < values.length; i++) {
          if (values[i] < min) min = values[i];
        }
        aggValue = min === Infinity ? 0 : min;
        break;
      }
      case 'MAX': {
        let max = -Infinity;
        for (let i = 0; i < values.length; i++) {
          if (values[i] > max) max = values[i];
        }
        aggValue = max === -Infinity ? 0 : max;
        break;
      }
      default:
        aggValue = sum;
    }
    return { [categoryField]: key, [valueField]: Math.round(aggValue * 100) / 100 };
  });

  let finalChartData = chartData;
  if (chartData.length > 30) {
    chartData.sort((a, b) => Math.abs(b[valueField] || 0) - Math.abs(a[valueField] || 0));
    const topCategories = chartData.slice(0, 30);
    const otherCategories = chartData.slice(30);
    const otherSum = otherCategories.reduce((sum, item) => sum + (item[valueField] || 0), 0);
    finalChartData = [
      ...topCategories,
      { [categoryField]: `Others (${otherCategories.length})`, [valueField]: Math.round(otherSum * 100) / 100 },
    ];
  }

  if (chartType === 'pie') {
    return {
      type: 'pie',
      data: [{ id: 'data', values: finalChartData }],
      categoryField: categoryField,
      valueField: valueField,
      outerRadius: 0.8,
      innerRadius: 0.5,
      label: {
        visible: true,
        formatMethod: (text, datum) => {
          const val = datum[valueField];
          const pct = datum.percent !== undefined ? (datum.percent * 100).toFixed(1) : '';
          return pct ? `${datum[categoryField]}: ${val} (${pct}%)` : `${datum[categoryField]}: ${val}`;
        },
        style: { fill: '#e2e4f0', fontSize: 11 },
      },
      tooltip: { mark: { visible: true } },
      legends: {
        visible: true,
        orient: 'bottom',
        item: { label: { style: { fill: '#8b8fa8' } } },
      },
      title: {
        text: `${valueField} by ${categoryField} (${aggregation})`,
        textStyle: { fill: '#e2e4f0', fontSize: 14, fontWeight: 600 },
      },
    };
  }

  return {
    type: chartType,
    data: [{ id: 'data', values: finalChartData }],
    xField: categoryField,
    yField: valueField,
    axes: [
      {
        orient: 'bottom',
        label: { style: { fill: '#8b8fa8', fontSize: 11 } },
        domainLine: { style: { stroke: '#2e3350' } },
        tick: { style: { stroke: '#2e3350' } },
      },
      {
        orient: 'left',
        label: { style: { fill: '#8b8fa8', fontSize: 11 } },
        grid: { style: { stroke: '#2e3350' } },
        domainLine: { visible: false },
      },
    ],
    tooltip: { mark: { visible: true } },
    title: {
      text: `${valueField} by ${categoryField} (${aggregation})`,
      textStyle: { fill: '#e2e4f0', fontSize: 14, fontWeight: 600 },
    },
  };
}

function ChartPanel({ data, rawDataLength, pivotConfig }) {
  const [chartType, setChartType] = useState('bar');
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  const spec = useMemo(
    () => buildChartSpec(data, pivotConfig, chartType),
    [data, pivotConfig, chartType]
  );

  const isFilteredEmpty = rawDataLength > 0 && data.length === 0;

  useEffect(() => {
    if (!spec || !containerRef.current) {
      if (chartRef.current) {
        chartRef.current.release();
        chartRef.current = null;
      }
      return;
    }

    if (chartRef.current) {
      chartRef.current.updateSpec(spec);
    } else {
      chartRef.current = new VChart(spec, {
        dom: containerRef.current,
        theme: DARK_THEME,
      });
      chartRef.current.renderSync();
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.release();
        chartRef.current = null;
      }
    };
  }, [spec]);

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h2>📈 Chart View</h2>
        <div className="chart-type-selector">
          {CHART_TYPES.map(({ key, label }) => (
            <button
              key={key}
              id={`chart-type-${key}`}
              className={`chart-type-btn ${chartType === key ? 'active' : ''}`}
              onClick={() => setChartType(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {isFilteredEmpty ? (
        <div className="chart-empty">
          No data matches active filters
        </div>
      ) : spec ? (
        <div
          ref={containerRef}
          id="vchart-container"
          className="chart-container"
          style={{ minHeight: 400 }}
        />
      ) : (
        <div className="chart-empty">
          Assign at least one row field and one measure to see a chart.
        </div>
      )}
    </div>
  );
}

export default ChartPanel;
