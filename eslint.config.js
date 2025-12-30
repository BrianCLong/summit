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
  // Archive and legacy directories
  '.archive/**',
  '_salvage_from_refs/**',
  'templates/**',
  '.ci/**',
  '.disabled/**',
  '.github/**',
  // Non-core directories that don't require strict linting
  'scripts/**',
  'tools/**',
  'benchmarks/**',
  'examples/**',
  'zero-trust/**',
  'ga-graphai/**',
  'conductor-ui/**',
  'e2e/**',
  'mobile/**',
  'activities/**',
  '__mocks__/**',
  'bindings/**',
  'operator-kit/**',
  'platform/**',
  'companyos/**',
  'cli/**',
  'gateway/**',
  'adversarial-misinfo-defense-platform/**',
  'active-measures-module/**',
  'absorption/**',
  'assistant/**',
  '.maestro/**',
  '.security/**',
  // Additional directories
  'website/**',
  'workers/**',
  'sdk/**',
  'libs/**',
  'docs/**',
  'intelgraph/**',
  'intelgraph-mcp/**',
  'agents/**',
  'graphql/**',
  'agentic/**',
  'backend/**',
  'api/**',
  'bootstrap/**',
  'adapters/**',
  'tests/**',
  'src/**',
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
      'no-debugger': 'warn', // Relaxed to warn for gradual migration
      'no-alert': 'warn',
      'no-var': 'warn', // Relaxed to warn for gradual migration
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'warn',

      // Error Prevention
      'no-unused-vars': 'off', // handled by @typescript-eslint/no-unused-vars
      'no-unused-expressions': 'off',
      'no-undef': 'off', // TypeScript handles this
      'eqeqeq': ['warn', 'always', { null: 'ignore' }], // Relaxed to warn for gradual migration
      'no-implicit-coercion': 'warn',
      'no-throw-literal': 'warn', // Relaxed to warn for gradual migration

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
        'warn', // Relaxed to warn for gradual migration
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-require-imports': 'warn', // Relaxed for gradual migration
      '@typescript-eslint/ban-ts-comment': 'warn', // Relaxed for gradual migration
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      'no-useless-escape': 'warn', // Relaxed for gradual migration
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'no-prototype-builtins': 'warn',
      'no-fallthrough': 'warn',
      'no-control-regex': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-dupe-keys': 'warn',
      'no-shadow-restricted-names': 'warn',

      // Best Practices
      curly: ['warn', 'all'],
      'no-eval': 'warn', // Relaxed to warn for gradual migration
      'no-implied-eval': 'warn', // Relaxed to warn for gradual migration
      'no-new-func': 'warn', // Relaxed to warn for gradual migration
      'no-return-await': 'warn',
      'require-await': 'warn',
    },
  },
];
