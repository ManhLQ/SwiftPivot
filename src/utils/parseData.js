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

function resolvePath(obj, path) {
  if (!path || !path.trim()) return obj;
  return path.trim().split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

/**
 * Parse JSON text into typed objects with optional data path resolution.
 * @param {string} jsonText
 * @param {string} [dataPath='']
 * @returns {Object[]}
 */
export function parseJSON(jsonText, dataPath = '') {
  if (!jsonText || jsonText.trim() === '') {
    throw new Error('JSON input is empty');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText.trim());
  } catch (err) {
    throw new Error(`Invalid JSON format: ${err.message}`);
  }

  let rows;
  const trimmedPath = dataPath ? dataPath.trim() : '';

  if (trimmedPath !== '') {
    const extracted = resolvePath(parsed, trimmedPath);
    if (!Array.isArray(extracted)) {
      throw new Error(`Data path "${trimmedPath}" did not resolve to an array`);
    }
    rows = extracted;
  } else if (Array.isArray(parsed)) {
    rows = parsed;
  } else {
    throw new Error('JSON root must be an array of objects, or specify a data path (e.g. "result.data")');
  }

  return autoCastTypes(rows);
}

