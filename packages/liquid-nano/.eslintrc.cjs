module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    '@typescript-eslint/explicit-module-boundary-types': 'error'
  },
  overrides: [
    {
      files: ['**/__tests__/**'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
