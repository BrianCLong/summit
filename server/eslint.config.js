// ESLint v9 flat config for the Node/TS server
import globals from 'globals';
import * as tseslint from 'typescript-eslint';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.eslintrc.*', 'eslint.config.*.rehydrated', 'eslint.config.*.v9-backup'] },
  js.configs.recommended,
  // JavaScript ES module files (.mjs and .js using import/export)
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
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
      globals: { ...globals.node },
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
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-process-exit': 'off',
    },
  },
  // Script files - allow console output
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.js'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
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
    plugins: { jest: (await import('eslint-plugin-jest')).default },
    languageOptions: {
      parser: tseslint.parser, // Use TypeScript parser for .ts test files
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
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
    },
  },
  prettier,
];
