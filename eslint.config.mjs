import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
// import { fixupConfigAsPlugin } from '@eslint/compat';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['.ci/**'],
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // fixupConfigAsPlugin(pluginReactConfig),
  pluginReactConfig,
  {
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.json', './client/tsconfig.json', './apps/web/tsconfig.json'] },
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {}],
      'react/react-in-jsx-scope': 'off',
    },
  },
];
