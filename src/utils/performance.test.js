import { describe, it, expect, beforeEach } from 'vitest';
import { parseCSV } from './parseData.js';
import { filterData, deriveDefaultConfig } from './pivotHelpers.js';
import { savePersistedData, STORAGE_KEY } from './storageHelpers.js';

function generate10kCSV() {
  const headers = 'id,category,region,product,sales,quantity,discount,profit,status';
  const rows = [];
  rows.push(headers);
  const categories = ['Electronics', 'Furniture', 'Office Supplies', 'Clothing', 'Books'];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const statuses = ['Completed', 'Pending', 'Shipped', 'Cancelled'];

  for (let i = 1; i <= 10000; i++) {
    const cat = categories[i % categories.length];
    const reg = regions[i % regions.length];
    const prod = `Product_${i % 2000}`;
    const sales = (10.5 * (i % 100) + 5).toFixed(2);
    const qty = (i % 50 + 1).toString();
    const disc = (0.05 * (i % 5)).toFixed(2);
    const profit = (5.25 * (i % 80) - 10).toFixed(2);
    const stat = statuses[i % statuses.length];
    rows.push(`${i},${cat},${reg},${prod},${sales},${qty},${disc},${profit},${stat}`);
  }
  return rows.join('\n');
}

describe('10k dataset performance benchmarks', () => {
  const csvText = generate10kCSV();

  beforeEach(() => {
    localStorage.clear();
  });

  it('measures CSV parse time for 10k records', () => {
    const start = performance.now();
    const data = parseCSV(csvText);
    const elapsed = performance.now() - start;
    expect(data.length).toBe(10000);
    console.log(`[PERF] 10k CSV parse time: ${elapsed.toFixed(2)} ms`);
  });

  it('measures filterData time with large allowedValues array (e.g. 2000 items)', () => {
    const data = parseCSV(csvText);
    const uniqueProducts = Array.from(new Set(data.map(r => String(r.product))));
    const filters = {
      product: uniqueProducts,
    };

    const start = performance.now();
    const filtered = filterData(data, filters);
    const elapsed = performance.now() - start;
    console.log(`[PERF] 10k filterData with 2k filter items: ${elapsed.toFixed(2)} ms`);
    expect(filtered.length).toBe(10000);
  });

  it('measures storage save payload size and time with savePersistedData', () => {
    const data = parseCSV(csvText);
    const config = deriveDefaultConfig(data);
    
    // Simulate 10 edits creating 10 log entries with full data snapshots
    const changeLog = [];
    for (let i = 0; i < 10; i++) {
      changeLog.push({
        id: `log_${i}`,
        timestamp: Date.now(),
        type: 'CELL_EDIT',
        dataSnapshot: data.map(r => ({ ...r })),
      });
    }

    const start = performance.now();
    savePersistedData({ data, pivotConfig: config, changeLog });
    const elapsed = performance.now() - start;

    const storedStr = localStorage.getItem(STORAGE_KEY);
    const sizeInMB = storedStr.length / (1024 * 1024);
    console.log(`[PERF] localStorage saved payload size with 10 change logs: ${sizeInMB.toFixed(2)} MB`);
    console.log(`[PERF] savePersistedData time: ${elapsed.toFixed(2)} ms`);
    expect(sizeInMB).toBeLessThan(3); // MUST be well within 5MB browser quota!
  });
});
