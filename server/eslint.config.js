// ESLint v9 flat config for the Node/TS server
import globals from 'globals';
import * as tseslint from 'typescript-eslint';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.eslintrc.*', 'eslint.config.*.rehydrated', 'eslint.config.*.v9-backup'] },
  js.configs.recommended,
  // Note: typescript-eslint recommended config temporarily disabled due to
  // compatibility issue with ESLint 9.33.0 + @typescript-eslint/eslint-plugin 8.0.0
  // Issue: @typescript-eslint/no-unused-expressions rule crashes with undefined options
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts', '*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        // Avoid project: './tsconfig.json' until tsconfig includes tests to prevent perf/parse errors
        ecmaFeatures: { jsx: false },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      'no-unused-expressions': 'off', // Disable due to ESLint 9/typescript-eslint compatibility issue
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    plugins: { jest: (await import('eslint-plugin-jest')).default },
    languageOptions: { globals: { ...globals.node, jest: true } },
    rules: {
      'jest/expect-expect': 'warn',
      'jest/no-disabled-tests': 'warn',
      'jest/no-identical-title': 'error',
    },
  },
  prettier,
];
