/**
 * Add numbers together.
 * @param {number[]} values - List of numbers to add.
 * @returns {number} Total sum of all values.
 */
export function sum(values) {
  /** @type {number} */
  let total_value = 0;
  for (const value_item of values) {
    total_value = total_value + value_item;
  }
  return total_value;
}
