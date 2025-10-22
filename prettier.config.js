/**
 * @import { Config } from 'prettier'
 */

/** @type {Config} */
export default {
  // Consolidated settings (was split between .prettierrc.json and this file)
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  proseWrap: 'always',
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: ['^@(.*)$', '<THIRD_PARTY_MODULES>', '^[./]'],
  importOrderSortSpecifiers: true,
};
