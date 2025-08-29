import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist', 'jest.config.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
];
