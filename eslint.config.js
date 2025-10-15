// ESLint v9 flat-config root
// Applies base JS/TS rules across the monorepo; package-level configs refine further.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.cache/**',
  '**/generated/**',
  'frontend/.vite/**', // legacy build artifacts
  'tests/**',
  'tools/**',
  'ui/**',
  'v24_modules/**',
  'v4/**',
  'web/**',
  'workers/**',
  'public/**',
  '**/*.min.js',
  '.github/workflows/compliance-automation.yml',
];

const MC_MODULE_FILES = [
  'server/src/services/MCLearningModuleService.ts',
  'server/src/routes/mcLearning.ts',
  'server/src/routes/__tests__/mcLearning.test.ts',
  'server/src/tests/mcLearningModule.test.ts',
];

const baseJsRules = js.configs.recommended.rules ?? {};
const baseTsRules = tsPlugin.configs['recommended']?.rules ?? {};

export default [
  { ignores: IGNORE },
  {
    files: MC_MODULE_FILES,
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: false },
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...baseJsRules,
      ...baseTsRules,
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
];
