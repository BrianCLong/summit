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
  { ignores: ['dist', 'build', 'coverage', 'node_modules', '*.min.js'] },
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
      '@typescript-eslint/no-unused-expressions': ['error', {}],
      '@typescript-eslint/no-unused-vars': 'warn',
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
  },
  {
    files: ['ui/components/Switchboard.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/\\S/]',
          message: 'Use t() for user-facing text in Switchboard (i18n).',
        },
        {
          selector:
            'JSXAttribute Literal[value=/\\S/]:matches([parent.name.name="placeholder"], [parent.name.name="title"], [parent.name.name="aria-label"], [parent.name.name="ariaLabel"])',
          message: 'Use t() for user-facing attribute strings in Switchboard (i18n).',
        },
      ],
    },
  }
);
