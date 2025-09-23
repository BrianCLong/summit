import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigAsPlugin } from "@eslint/js/dist/configs/eslint-plugin-react/lib/fixupConfigAsPlugin.js";
import importPlugin from "eslint-plugin-import";

export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  fixupConfigAsPlugin(pluginReactConfig),
  {
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.json', './client/tsconfig.json'] },
      },
    },
    rules: {
      'import/no-unresolved': 'error',
    },
  },
];
