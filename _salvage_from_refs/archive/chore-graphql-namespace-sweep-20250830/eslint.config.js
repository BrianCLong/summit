// eslint.config.js
import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import path from 'node:path';

const IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.vite/**',
  '**/.next/**',
  '**/.cache/**',
  '**/generated/**',
  'frontend/.vite/**' // legacy build artifacts
];

export default [
  { ignores: IGNORE },
  js.configs.recommended,
  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { // Explicitly define plugins
      '@typescript-eslint': tseslint.plugin,
    },
    // Removed 'extends' and spread the configurations directly
    ...tseslint.configs.recommended.flat,
    ...tseslint.configs.stylistic.flat,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_+', varsIgnorePattern: '^_+', ignoreRestSiblings: true }],
      'no-undef': 'off',
      '@typescript-eslint/no-var-requires': 'error', // Ensure require is forbidden in TS files
      '@typescript-eslint/no-explicit-any': 'error', // Explicitly disallow 'any'
    }
  },
  // Configuration for JavaScript files (CommonJS and ES Modules)
  {
    files: ['**/*.js'], // .js files are now ES Modules by default due to "type": "module" in package.json
    plugins: { // Explicitly define plugins
      '@typescript-eslint': tseslint.plugin,
    },
    ...tseslint.configs.recommended.flat,
    ...tseslint.configs.stylistic.flat,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module', // Explicitly set to module for .js files
        project: ['tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_+', varsIgnorePattern: '^_+', ignoreRestSiblings: true }],
      'no-undef': 'off',
      'no-empty': 'error',
      'no-prototype-builtins': 'error',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      'no-dupe-class-members': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-duplicate-case': 'error',
      'no-useless-catch': 'error',
      'no-unused-expressions': 'error',
      'no-redeclare': 'error',
      'prefer-spread': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
    }
  },
  // Configuration for explicit CommonJS files (.cjs)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs', // Explicitly set to commonjs for .cjs files
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_+' }],
      'no-undef': 'off',
      'no-empty': 'error',
      'no-prototype-builtins': 'error',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      'no-dupe-class-members': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-duplicate-case': 'error',
      'no-useless-catch': 'error',
      'no-unused-expressions': 'error',
      'no-redeclare': 'off', // Turn off for now
      'prefer-spread': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'testing-library/no-node-access': 'off' // Turn off for now
    }
      'no-undef': 'off',
      'no-empty': 'error',
      'no-prototype-builtins': 'error',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      'no-dupe-class-members': 'error',
      'no-async-promise-executor': 'error',
      'no-case-declarations': 'error',
      'no-duplicate-case': 'error',
      'no-useless-catch': 'error',
      'no-unused-expressions': 'error',
      'no-redeclare': 'error',
      'prefer-spread': 'warn',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    }
  },
  // Disable formatting-related rules in favor of Prettier
  prettier
];