// ESLint v9 flat config for the React client (Vite)
import globals from 'globals';
import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';

export default [
  { ignores: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh, import: importPlugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      'react/jsx-uses-react': 'off', // new JSX transform
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': ['error', {
        'patterns': [
          {
            'group': ['@apollo/client'],
            'importNames': ['gql'],
            'message': 'Use generated hooks/documents from src/generated/graphql instead of gql literals.'
          },
          '*.ts', '*.tsx'
        ]
      }],
      // Enforce ESM-friendly imports for NodeNext/Vite
      'import/extensions': ['error', 'ignorePackages', {
        js: 'always', jsx: 'always', ts: 'never', tsx: 'never'
      }]
    }
  },
  {
    files: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    plugins: { jest: (await import('eslint-plugin-jest')).default },
    languageOptions: { globals: { ...globals.browser, jest: true } },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-identical-title': 'error'
    }
  },
  prettier
];
