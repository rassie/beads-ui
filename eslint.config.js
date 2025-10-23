import js from '@eslint/js';
import plugin_jsdoc from 'eslint-plugin-jsdoc';
import plugin_n from 'eslint-plugin-n';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  {
    ignores: ['node_modules', 'coverage', 'dist', '.beads']
  },
  js.configs.recommended,
  plugin_jsdoc.configs['flat/recommended'],
  {
    settings: {
      jsdoc: {
        mode: 'typescript',
        preferredTypes: {
          object: 'Object'
        }
      }
    },
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-property-description': 'off',
      'jsdoc/reject-any-type': 'off',
      'jsdoc/require-returns': 'off'
    }
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: globals.vitest
    }
  },
  {
    files: ['server/**/*.js'],
    ...plugin_n.configs['flat/recommended'],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      'n/no-unpublished-import': 'off'
    }
  },
  {
    files: ['bin/**/*.js'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['app/**/*.js'],
    languageOptions: {
      globals: globals.browser
    }
  }
]);
