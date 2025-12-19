import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'dist/',
      'build/',
      'coverage/',
      'node_modules/',
      'public/',
      '*.min.js',
      '.github/workflows/compliance-automation.yml',
      '.vite/',
      '.next/',
      '.cache/',
      '.turbo/',
      'generated/',
      'v4/archive/',
      '.venv/',
      'venv/',
      'v24_modules/',
    ],
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin, react: reactPlugin },
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            './client/tsconfig.json',
            './packages/connector-sdk/tsconfig.json',
            './packages/etl-assistant/tsconfig.json',
            './services/universal-ingestion/tsconfig.json',
          ],
        },
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'import/no-unresolved': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {}],
    },
  },
];
