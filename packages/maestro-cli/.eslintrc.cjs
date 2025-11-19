module.exports = {
  extends: ['../../.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
    'no-case-declarations': 'warn',
    'import/order': 'off',
    'import/no-unresolved': 'off',
    'import/no-named-as-default-member': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-var-requires': 'off',
  },
};
