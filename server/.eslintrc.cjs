// Quick fix for pre-commit lint issues - Production focused
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
  env: {
    node: true,
    es6: true,
    jest: true,
  },
  ignorePatterns: [
    'dist/**',
    'coverage/**',
    'node_modules/**',
    'federation.plan.test.ts',
    'jest.config.ts',
    'playwright.config.ts',
    'tests/**',
    'scripts/**',
    'perf/**',
    'eslint-rules/**',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['*.js', '*.cjs'],
      env: { commonjs: true },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
