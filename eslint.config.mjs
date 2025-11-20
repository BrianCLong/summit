import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jestPlugin from 'eslint-plugin-jest';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import { fixupPluginRules } from '@eslint/compat';

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.cache/**',
  '**/generated/**',
  'frontend/.vite/**',
  '**/public/**',
  '**/*.min.js',
  '.github/workflows/compliance-automation.yml',
  'v4/archive/**',
  '.venv/**',
  'venv/**',
  '**/*.d.ts',
  '**/*.map',
];

export default tseslint.config(
  { ignores: IGNORE },

  // Base JS/TS
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Global settings
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: [
            './tsconfig.json',
            './server/tsconfig.json',
            './client/tsconfig.json',
          ],
        },
        node: true,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],

      // Import rules
      'import/order': [
        'error',
        { 'newlines-between': 'always', alphabetize: { order: 'asc' } },
      ],
    },
  },

  // JS specific overrides
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // React (conditional on files)
  {
    files: ['**/*.{jsx,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      'react-hooks': fixupPluginRules(reactHooksPlugin),
    },
    rules: {
       ...reactHooksPlugin.configs.recommended.rules,
       'react/react-in-jsx-scope': 'off',
       'react/prop-types': 'off',
    },
  },

  // Jest/Tests
  {
    files: ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', '**/tests/**'],
    plugins: { jest: jestPlugin },
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/expect-expect': 'off',
    },
  },

  // Prettier (must be last)
  prettier,
);
