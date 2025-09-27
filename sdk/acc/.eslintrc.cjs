module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  extends: ["eslint:recommended", "plugin:import/recommended", "plugin:import/typescript", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "import/no-unresolved": "off"
  },
  ignorePatterns: ["dist"]
};
