import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';

const base = [
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/node_modules/**', 'docs-site/**', '.github/workflows/compliance-automation.yml'],
  },
  js.configs.recommended,
];

const typed = tseslint.config({
  files: ['**/*.{ts,tsx,js,jsx}'],
  extends: [
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
  ],
  plugins: {
    react: reactPlugin
  },
  languageOptions: {
    parserOptions: {
      project: null,
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    'no-console': 'warn',
    ...reactPlugin.configs.recommended.rules,
    ...reactPlugin.configs['jsx-runtime'].rules,
  },
});

// Loosen only for CLI package (allow console/require/any)
const cli = {
  files: ['packages/maestro-cli/**'],
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};

// Tests: loosen a bit
const tests = {
  files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**'],
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};

const conductorUi = {
  files: ['conductor-ui/**'],
  rules: {
    'no-console': 'off',
  },
};

export default [...base, ...typed, cli, tests, conductorUi];