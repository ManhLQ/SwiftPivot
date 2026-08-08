/**
 * Build a VTable PivotTable option object from data and pivot configuration.
 *
 * @param {Object[]} data - The raw data records.
 * @param {{ rows: string[], columns: string[], measures: string[], aggregation: string }} config
 * @returns {Object} VTable PivotTable option.
 */
export function buildPivotOption(data, config, themeName = 'default') {
  const {
    rows,
    columns,
    measures,
    aggregation,
    showGrandTotals = true,
    showSubTotals = true,
    rowHierarchyType = 'tree',
  } = config;

  if (!data || data.length === 0 || measures.length === 0) {
    return null;
  }

  const rowDimensions = rows.map((key) => ({
    dimensionKey: key,
    title: key,
  }));

  const colDimensions = columns.map((key) => ({
    dimensionKey: key,
    title: key,
  }));

  const indicators = measures.map((key) => ({
    indicatorKey: key,
    title: key,
    width: 'auto',
    style: (cellInfo) => {
      if (cellInfo && cellInfo.record && cellInfo.record._isEdited) {
        return {
          color: '#ef4444',
          fontWeight: 'bold',
        };
      }
      return {};
    },
  }));

  const aggregationRules = measures.map((key) => ({
    indicatorKey: key,
    field: key,
    aggregationType: aggregation === 'AVG' ? 'AVG' : aggregation,
  }));

  return {
    records: data,
    rows: rowDimensions,
    columns: colDimensions,
    indicators,
    rowHierarchyType: rowHierarchyType || 'tree',
    dataConfig: {
      aggregationRules,
      totals: {
        row: {
          showGrandTotals: showGrandTotals !== false,
          showSubTotals: showSubTotals !== false,
          subTotalsDimensions: rows.length > 0 ? [rows[0]] : [],
          grandTotalLabel: 'Grand Total',
          subTotalLabel: 'Subtotal',
          headerStyle: {
            fontWeight: 'bold',
          },
          style: {
            fontWeight: '600',
          },
        },
        column: {
          showGrandTotals: showGrandTotals !== false,
          showSubTotals: showSubTotals !== false,
          subTotalsDimensions: columns.length > 0 ? [columns[0]] : [],
          grandTotalLabel: 'Grand Total',
          subTotalLabel: 'Subtotal',
          headerStyle: {
            fontWeight: 'bold',
          },
          style: {
            fontWeight: '600',
          },
        },
      },
    },
    widthMode: 'autoWidth',
    defaultHeaderColWidth: 130,
    defaultColWidth: 120,
    theme: themeName || 'default',
    scrollStyle: {
      visible: 'always',
      hoverOn: false,
      width: 12,
      scrollSliderCornerRadius: 4,
    },
  };
}

/**
 * Filter data rows based on active field filters.
 *
 * @param {Object[]} data
 * @param {Object.<string, string[]>} filters
 * @returns {Object[]} Filtered data
 */
export function filterData(data, filters) {
  if (!data || data.length === 0) return [];
  if (!filters || Object.keys(filters).length === 0) return data;

  const activeFilterEntries = Object.entries(filters)
    .filter(([_, allowedValues]) => Array.isArray(allowedValues))
    .map(([field, allowedValues]) => [field, new Set(allowedValues)]);

  if (activeFilterEntries.length === 0) return data;

  return data.filter((row) =>
    activeFilterEntries.every(([field, allowedSet]) => {
      const rowVal = String(row[field] ?? '');
      return allowedSet.has(rowVal);
    })
  );
}

/**
 * Derive a sensible default pivot config from the data's columns.
 * String-only fields → rows; numeric fields → measures.
 *
 * @param {Object[]} data
 * @returns {{ rows: string[], columns: string[], measures: string[], filters: Object, aggregation: string, showGrandTotals: boolean, showSubTotals: boolean, rowHierarchyType: string }}
 */
export function deriveDefaultConfig(data) {
  if (!data || data.length === 0) {
    return { rows: [], columns: [], measures: [], filters: {}, aggregation: 'SUM', showGrandTotals: true, showSubTotals: true, rowHierarchyType: 'tree' };
  }

  const allCols = Object.keys(data[0]);
  const sample = data.slice(0, 100);
  const numericCols = allCols.filter((col) =>
    sample.some((row) => typeof row[col] === 'number')
  );
  const stringCols = allCols.filter(
    (col) => !numericCols.includes(col)
  );

  return {
    rows: stringCols.slice(0, 2),
    columns: [],
    measures: numericCols.slice(0, 3),
    filters: {},
    aggregation: 'SUM',
    showGrandTotals: true,
    showSubTotals: true,
    rowHierarchyType: 'tree',
  };
}

