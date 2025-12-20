import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import { fixupPluginRules } from '@eslint/compat';
import importPlugin from 'eslint-plugin-import';

export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: fixupPluginRules(pluginReact),
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.json', './client/tsconfig.json'] },
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', {}],
    },
  },
];
