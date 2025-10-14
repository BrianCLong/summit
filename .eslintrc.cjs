module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: { react: { version: '18.0' } },
  overrides: [
    {
      files: ['**/__tests__/**/*.*', '**/*.test.*', 'tests/**/*.*', 'server/src/tests/**/*.*'],
      env: { jest: true, node: true },
      plugins: ['jest'],
      extends: ['plugin:jest/recommended'],
      rules: {
        'jest/no-focused-tests': 'error',
        'jest/no-disabled-tests': 'warn',
        'no-restricted-properties': [
          'error',
          {
            object: 'console',
            property: 'error',
            message: 'Use assertions or throw errors instead of console.error in tests',
          },
        ],
      },
    },
  ],
  rules: {
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  },
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules']
};
