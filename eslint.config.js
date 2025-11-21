
import security from "eslint-plugin-security";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import globals from "globals";

export default [
  {
    plugins: {
      security,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-return-assign": "error",
      "no-param-reassign": ["error", { props: false }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      eqeqeq: ["error", "always"],
      strict: ["error", "global"],
      "no-var": "error",
      "prefer-const": "error",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.js", "**/*.spec.ts", "**/*.spec.js"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-child-process": "off",
      "no-console": "off",
    },
  },
];
