import Papa from 'papaparse';

/**
 * Convert numeric string values to actual numbers in each row.
 * @param {Object[]} rows
 * @returns {Object[]}
 */
export function autoCastTypes(rows) {
  return rows.map(row => {
    const newRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
        newRow[key] = Number(value);
      } else {
        newRow[key] = value;
      }
    }
    return newRow;
  });
}

/**
 * Parse CSV text into typed objects.
 * @param {string} csvText
 * @returns {Object[]}
 */
export function parseCSV(csvText) {
  if (!csvText || csvText.trim() === '') {
    throw new Error('CSV input is empty');
  }
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }
  return autoCastTypes(result.data);
}

/**
 * Parse JSON text into typed objects.
 * @param {string} jsonText
 * @returns {Object[]}
 */
export function parseJSON(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed)) {
    throw new Error('JSON data must be an array of objects');
  }
  return autoCastTypes(parsed);
}
