import { describe, it, expect } from 'vitest';
import { filterData, deriveDefaultConfig, buildPivotOption } from './pivotHelpers.js';

describe('pivotHelpers', () => {
  const sampleData = [
    { Category: 'Tech', Region: 'North', Sales: 100 },
    { Category: 'Tech', Region: 'South', Sales: 200 },
    { Category: 'Furniture', Region: 'North', Sales: 150 },
    { Category: 'Furniture', Region: 'South', Sales: 300 },
  ];

  describe('filterData', () => {
    it('returns original data when filters is empty or null', () => {
      expect(filterData(sampleData, {})).toEqual(sampleData);
      expect(filterData(sampleData, null)).toEqual(sampleData);
      expect(filterData(sampleData, undefined)).toEqual(sampleData);
    });

    it('filters rows matching allowed values for a single field', () => {
      const filters = { Category: ['Tech'] };
      const result = filterData(sampleData, filters);
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.Category === 'Tech')).toBe(true);
    });

    it('filters rows matching multiple fields', () => {
      const filters = { Category: ['Tech'], Region: ['South'] };
      const result = filterData(sampleData, filters);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ Category: 'Tech', Region: 'South', Sales: 200 });
    });

    it('excludes all rows if a field filter is an empty array', () => {
      const filters = { Category: [] };
      const result = filterData(sampleData, filters);
      expect(result).toHaveLength(0);
    });

    it('converts non-string field values to string for matching', () => {
      const filters = { Sales: ['100', '300'] };
      const result = filterData(sampleData, filters);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.Sales)).toEqual([100, 300]);
    });
  });

  describe('deriveDefaultConfig', () => {
    it('includes empty filters object in default config', () => {
      const config = deriveDefaultConfig(sampleData);
      expect(config.filters).toEqual({});
    });
  });

  describe('buildPivotOption', () => {
    it('passes theme property when themeName is provided', () => {
      const data = [{ a: '1', b: 2 }];
      const config = { rows: ['a'], columns: [], measures: ['b'], aggregation: 'SUM' };
      const option = buildPivotOption(data, config, 'simplify');
      expect(option.theme).toBe('simplify');
    });

    it('defaults theme property to default when themeName is omitted', () => {
      const data = [{ a: '1', b: 2 }];
      const config = { rows: ['a'], columns: [], measures: ['b'], aggregation: 'SUM' };
      const option = buildPivotOption(data, config);
      expect(option.theme).toBe('default');
    });

    it('configures English subTotalLabel and respects showGrandTotals / showSubTotals flags', () => {
      const data = [{ a: '1', b: 2 }];
      const config = { rows: ['a'], columns: [], measures: ['b'], aggregation: 'SUM', showGrandTotals: false, showSubTotals: true };
      const option = buildPivotOption(data, config);

      expect(option.dataConfig.totals.row.subTotalLabel).toBe('Subtotal');
      expect(option.dataConfig.totals.row.grandTotalLabel).toBe('Grand Total');
      expect(option.dataConfig.totals.row.showGrandTotals).toBe(false);
      expect(option.dataConfig.totals.row.showSubTotals).toBe(true);
      expect(option.rowHierarchyType).toBe('tree');
    });

    it('buildPivotOption configures cell style to highlight modified records', () => {
      const data = [
        { Region: 'East', Sales: 100, _isEdited: true },
        { Region: 'West', Sales: 200 },
      ];
      const config = { rows: ['Region'], columns: [], measures: ['Sales'], aggregation: 'SUM' };
      const option = buildPivotOption(data, config);
      expect(option).not.toBeNull();
      expect(option.indicators[0].style).toBeDefined();

      const styleFn = option.indicators[0].style;
      expect(typeof styleFn).toBe('function');
      const highlightedStyle = styleFn({ record: { _isEdited: true } });
      expect(highlightedStyle.color).toBe('#ef4444');
      expect(highlightedStyle.fontWeight).toBe('bold');

      const normalStyle = styleFn({ record: { _isEdited: false } });
      expect(normalStyle).toEqual({});
    });
  });
});

