import js from '@eslint/js';
import * as tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['packages/agent-context/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'require-await': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
];
