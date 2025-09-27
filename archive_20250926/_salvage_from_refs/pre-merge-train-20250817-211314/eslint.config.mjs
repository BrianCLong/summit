import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "client/**",
      "server/**",
      "ml/**",
      "deploy/**",
      "docs/**",
      "scripts/**",
      "tests/**",
      "uploads/**",
      "logs/**",
      "temp/**",
      "tmp/**",
      "backups/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
