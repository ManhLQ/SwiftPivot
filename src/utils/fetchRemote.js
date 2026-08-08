import { autoCastTypes } from './parseData.js';

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

/**
 * Fetch data from a remote HTTP endpoint and return a typed row array.
 */
export async function fetchRemote({
  url,
  method = 'GET',
  headers = {},
  body,
  responsePath,
} = {}) {
  const requestInit = {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (requestInit.method === 'POST' && body != null) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestInit);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  let rows;

  if (responsePath && responsePath.trim() !== '') {
    const extracted = resolvePath(json, responsePath.trim());
    if (!Array.isArray(extracted)) {
      throw new Error(`Response path "${responsePath.trim()}" did not resolve to an array`);
    }
    rows = extracted;
  } else if (Array.isArray(json)) {
    rows = json;
  } else {
    rows = [json];
  }

  return autoCastTypes(rows);
}
