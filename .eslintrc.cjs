/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: [
    '@typescript-eslint', 'unused-imports', 'import', 'promise', 'eslint-comments', 'react', 'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:eslint-comments/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  ignorePatterns: [
    'dist', 'build', 'coverage', 'node_modules', 'public', '*.config.js', '*.config.cjs', '*.min.js',
    '.github/workflows/compliance-automation.yml'
  ],
  overrides: [
    {
      files: ['**/*.test.*', '**/__tests__/**/*.*', 'e2e/**/*.*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off'
      }
    }
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'import/order': ['warn', { alphabetize: { order: 'asc', caseInsensitive: true }, 'newlines-between': 'always' }],
    'unused-imports/no-unused-imports': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  }
};

