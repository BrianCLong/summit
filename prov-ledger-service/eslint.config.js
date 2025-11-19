import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {}],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
];
