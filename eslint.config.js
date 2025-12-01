// ESLint v9 flat-config root
// Applies base JS/TS rules across the monorepo; package-level configs refine further.
import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import globals from 'globals';

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.cache/**',
  '**/.turbo/**',
  '**/generated/**',
  'frontend/.vite/**', // legacy build artifacts
  '**/public/**',
  '**/*.min.js',
  '.github/workflows/compliance-automation.yml',
  'v4/archive/**',
  '.venv/**',
  'venv/**',
  '**/v24_modules/**',
];

export default [
  { ignores: IGNORE },
  js.configs.recommended,
  ...tseslint.configs.recommended, // type-agnostic rules; package configs can opt into type-aware if desired
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        // Avoid project-based type checking here to keep root fast
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Code Quality
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'warn',

      // Error Prevention
      'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
      'no-unused-expressions': 'off',
      'no-undef': 'off', // TypeScript handles this
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-implicit-coercion': 'warn',
      'no-throw-literal': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Pragmatic for gradual migration
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Best Practices
      curly: ['warn', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn',
      'require-await': 'warn',
    },
  },
];
