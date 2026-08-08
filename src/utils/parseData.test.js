import { describe, it, expect } from 'vitest';
import { autoCastTypes, parseCSV, parseJSON } from './parseData.js';

describe('autoCastTypes', () => {
  it('converts integer strings to numbers', () => {
    const input = [{ name: 'Alice', age: '30', score: '95' }];
    const result = autoCastTypes(input);
    expect(result[0].age).toBe(30);
    expect(result[0].score).toBe(95);
  });

  it('converts float strings to numbers', () => {
    const input = [{ price: '19.99', tax: '2.50' }];
    const result = autoCastTypes(input);
    expect(result[0].price).toBe(19.99);
    expect(result[0].tax).toBe(2.5);
  });

  it('preserves non-numeric strings', () => {
    const input = [{ name: 'Alice', city: 'NYC' }];
    const result = autoCastTypes(input);
    expect(result[0].name).toBe('Alice');
    expect(result[0].city).toBe('NYC');
  });

  it('handles empty strings and null values', () => {
    const input = [{ a: '', b: null, c: undefined }];
    const result = autoCastTypes(input);
    expect(result[0].a).toBe('');
    expect(result[0].b).toBe(null);
  });

  it('handles negative numbers', () => {
    const input = [{ val: '-42', rate: '-3.14' }];
    const result = autoCastTypes(input);
    expect(result[0].val).toBe(-42);
    expect(result[0].rate).toBe(-3.14);
  });
});

describe('parseCSV', () => {
  it('parses CSV text with headers into typed objects', () => {
    const csv = 'name,age,city\nAlice,30,NYC\nBob,25,LA';
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Alice', age: 30, city: 'NYC' });
    expect(result[1]).toEqual({ name: 'Bob', age: 25, city: 'LA' });
  });

  it('skips empty lines', () => {
    const csv = 'a,b\n1,2\n\n3,4\n';
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
  });

  it('throws on empty input', () => {
    expect(() => parseCSV('')).toThrow();
  });
});

describe('parseJSON', () => {
  it('parses valid JSON array', () => {
    const json = '[{"name":"Alice","age":30}]';
    const result = parseJSON(json);
    expect(result).toHaveLength(1);
    expect(result[0].age).toBe(30);
  });

  it('throws if JSON is not an array', () => {
    expect(() => parseJSON('{"key":"value"}')).toThrow('must be an array');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJSON('not json')).toThrow();
  });

  it('auto-casts numeric strings in parsed JSON', () => {
    const json = '[{"price":"9.99","name":"widget"}]';
    const result = parseJSON(json);
    expect(result[0].price).toBe(9.99);
    expect(result[0].name).toBe('widget');
  });
});
