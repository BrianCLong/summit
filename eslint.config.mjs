import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { fixupPluginRules } from '@eslint/compat';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import-x';
import jestPlugin from 'eslint-plugin-jest';

export default tseslint.config(
  { ignores: [
    'dist', 'build', 'coverage', 'node_modules', '*.min.js',
    '.archive/**', '_salvage_from_refs/**', 'templates/**', '.ci/**', '.disabled/**', '.github/**',
    'scripts/**', 'tools/**', 'benchmarks/**', 'examples/**', 'zero-trust/**',
    'ga-graphai/**', 'conductor-ui/**', 'e2e/**', 'mobile/**', 'activities/**',
    '__mocks__/**', 'bindings/**', 'operator-kit/**', 'platform/**', 'companyos/**',
    'cli/**', 'gateway/**', 'adversarial-misinfo-defense-platform/**', 'active-measures-module/**',
    'absorption/**', 'assistant/**', '.maestro/**', '.security/**',
    'website/**', 'workers/**', 'sdk/**', 'libs/**', 'docs/**', 'intelgraph/**',
    'intelgraph-mcp/**', 'agents/**', 'graphql/**', 'agentic/**', 'backend/**',
    'api/**', 'bootstrap/**', 'adapters/**', 'tests/**', 'src/**'
  ] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import': importPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: { project: ['./tsconfig.json', './client/tsconfig.json'] },
      },
    },
    rules: {
      'import/order': [
        'error',
        { 'newlines-between': 'always', alphabetize: { order: 'asc' } },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // Changed from 'off' to 'warn'
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['warn', { allowShortCircuit: true, allowTernary: true }],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-useless-escape': 'warn',
      'no-console': 'warn', // Warn about console statements
    },
  },
  {
    files: ['**/__tests__/**/*.*', '**/*.test.*', 'tests/**/*.*', 'server/src/tests/**/*.*'],
    languageOptions: { globals: { ...globals.jest } },
    plugins: { jest: jestPlugin },
    extends: [jestPlugin.configs['recommended']],
    rules: {
      'jest/no-focused-tests': 'error',
      'jest/no-disabled-tests': 'warn',
      'no-restricted-properties': [
        'error',
        {
          object: 'console',
          property: 'error',
          message:
            'Use assertions or throw errors instead of console.error in tests',
        },
      ],
    },
  }
);
