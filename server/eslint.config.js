// ESLint v9 flat config for the Node/TS server
import fs from 'fs';
import globals from 'globals';
import * as tseslint from 'typescript-eslint';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

const legacyFiles = JSON.parse(fs.readFileSync('.eslint-legacy-files.json', 'utf8'));

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.eslintrc.*',
      'eslint.config.*.rehydrated',
      'eslint.config.*.v9-backup',
      'server.js',
      'tests/**',
    ],
  },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-async-promise-executor': 'warn',
      'no-dupe-keys': 'warn',
      'no-shadow-restricted-names': 'warn',
      'no-redeclare': 'warn',
      'no-empty-pattern': 'warn',
      'no-control-regex': 'warn',
      'no-unreachable': 'warn',
      'no-duplicate-case': 'warn',
      'no-dupe-class-members': 'warn',
      'no-prototype-builtins': 'warn',
      'no-undef': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  // JavaScript ES module files (.mjs and .js using import/export)
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // CommonJS files (.cjs or specific CommonJS .js files)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // K6 performance test files
  {
    files: ['perf/**/*.js', 'tests/k6*.js', 'tests/**/*k6*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // K6 uses console for output
    },
  },
  // TypeScript files - Note: typescript-eslint recommended config temporarily disabled due to
  // compatibility issue with ESLint 9.33.0 + @typescript-eslint/eslint-plugin 8.0.0
  // Issue: @typescript-eslint/no-unused-expressions rule crashes with undefined options
  {
    files: ['src/**/*.ts', '*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        NodeJS: 'readonly', // TypeScript namespace for Node.js types
      },
      parserOptions: {
        // Avoid project: './tsconfig.json' until tsconfig includes tests to prevent perf/parse errors
        ecmaFeatures: { jsx: false },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      'no-unused-expressions': 'off', // Disable due to ESLint 9/typescript-eslint compatibility issue
      'no-unused-vars': 'off', // Disable base rule in favor of @typescript-eslint version
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // Script files - allow console output
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.js'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      'no-console': 'off', // Scripts need console output
      'no-process-exit': 'off',
    },
  },
  // Test files - Jest environment (including __tests__ directories and __mocks__)
  {
    files: [
      'tests/**/*.ts',
      'tests/**/*.js',
      'tests/**/*.cjs',
      '__tests__/**/*.ts',
      '__tests__/**/*.js',
      'src/tests/**/*.ts',
      'src/tests/**/*.js',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.js',
      'src/**/__mocks__/**/*.ts',
      'src/**/__mocks__/**/*.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/*.test.ts',
      '**/*.test.js',
    ],
    plugins: {
      jest: (await import('eslint-plugin-jest')).default,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser, // Use TypeScript parser for .ts test files
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        // Transform globals.jest values from false to 'readonly'
        ...Object.fromEntries(
          Object.keys(globals.jest).map(key => [key, 'readonly'])
        ),
        NodeJS: 'readonly', // TypeScript namespace
      },
    },
    rules: {
      'jest/expect-expect': 'warn',
      'jest/no-disabled-tests': 'warn',
      'jest/no-identical-title': 'error',
      'no-console': 'off', // Allow console in tests
      'no-unused-vars': 'off', // Disable base rule in favor of @typescript-eslint version
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // Tests often need flexibility with any types
    },
  },
  // Legacy files exemption (gradual migration)
  {
    files: legacyFiles,
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-empty': 'off',
      'jest/expect-expect': 'off',
      'no-redeclare': 'off',
      'no-useless-catch': 'off',
      'no-control-regex': 'off',
      'no-unreachable': 'off',
      'no-shadow-restricted-names': 'off',
      'no-prototype-builtins': 'off',
      'no-duplicate-case': 'off',
      'no-async-promise-executor': 'off',
      'no-undef': 'off',
      'no-empty-pattern': 'off',
      'require-yield': 'off',
      'no-dupe-keys': 'off',
      'no-dupe-class-members': 'off',
    },
  },
  prettier,
];
