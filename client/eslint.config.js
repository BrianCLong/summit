// ESLint v9 flat config for the React client (Vite)
import globals from 'globals';
import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      '_stashed_archive/**',
      '__mocks__/**',
      '**/.eslintrc.cjs',
      '../../.Trash/**',
      'browser-extension/**',
      '_stashed_archive/**',
      'examples/**',
      'tests/**',
      'test/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-undef': 'off',
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'off',
      'import/order': 'off',
      'import/default': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'comma-dangle': 'off',
      'no-useless-escape': 'warn',
      'no-empty': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tseslint.parser,
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/jsx-uses-react': 'off', // new JSX transform
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {}],
      'import/order': 'off',
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'off',
      'import/default': 'off',
      'comma-dangle': 'off',
      'no-undef': 'off',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'no-empty': 'warn',
      'no-fallthrough': 'off',
      'no-useless-escape': 'warn',
    },
  },
  {
    files: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    plugins: { jest: (await import('eslint-plugin-jest')).default },
    languageOptions: { globals: { ...globals.browser, jest: true } },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-identical-title': 'error',
    },
  },
  prettier,
];
