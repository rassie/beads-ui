import { describe, expect, test } from 'vitest';
import { sum } from './sum.js';

describe('sum', () => {
  test('returns sum of numbers', () => {
    const result_value = sum([1, 2, 3]);
    expect(result_value).toBe(6);
  });
});
