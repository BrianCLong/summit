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
  rules: {
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    "testing-library/no-node-access": "error",
    "testing-library/prefer-find-by": "warn",
    "testing-library/no-wait-for-empty-callback": "error"
  },
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules']
};