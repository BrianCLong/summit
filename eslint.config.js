process.env.TS_NODE_TRANSPILE_ONLY = '1';
process.env.TS_ESLINT_DISABLE_SIZE_LIMIT = '1';

import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import ts from 'typescript-eslint';

const TYPED_SOURCE_GLOBS = [
  'apps/**/src/**/*.{ts,tsx}',
  'packages/**/src/**/*.{ts,tsx}',
  'client/src/**/*.{ts,tsx}',
  'server/src/**/*.{ts,tsx}',
  'services/**/src/**/*.{ts,tsx}'
];

const TYPED_IGNORES = [
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  '**/tests/**',
  '**/e2e/**'
];

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/.cache/**',
  '**/.vite/**',
  '**/coverage/**',
  '**/*.d.ts',
  '**/*.gen.ts',
  '**/generated/**',
  'frontend/.vite/**'
];

export default [
  { ignores: IGNORE },
  js.configs.recommended,
  ...ts.configs.disableTypeChecked,
  ...ts.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off'
    }
  },
  {
    files: TYPED_SOURCE_GLOBS,
    ignores: TYPED_IGNORES,
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }]
    }
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**/*'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off'
    }
  },
  {
    files: ['**/e2e/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  prettier
];
