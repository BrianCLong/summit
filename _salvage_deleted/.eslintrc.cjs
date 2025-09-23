module.exports = {
  root: true,
  env: { node: true, browser: true, es2022: true, jest: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: [
      './tsconfig.json',
      './server/tsconfig.json',
      './prov-ledger-service/tsconfig.json'
    ],
    tsconfigRootDir: __dirname
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: { 
    react: { version: '18.0' },
    'import/resolver': {
      typescript: {
        project: [
          './tsconfig.json',
          './server/tsconfig.json',
          './prov-ledger-service/tsconfig.json'
        ]
      }
    }
  },
  rules: {
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  },
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules', '*.js', '*.mjs', '*.cjs'],
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn'
      }
    }
  ]
};