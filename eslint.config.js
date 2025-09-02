import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const base = [
  {
    ignores: ['**/dist/**', '**/build/**', '**/coverage/**', '**/node_modules/**', 'docs-site/**', '.github/workflows/compliance-automation.yml'],
  },
  js.configs.recommended,
];

const typed = tseslint.config({
  files: ['**/*.{ts,tsx,js,jsx}'],
  extends: [
    // Use NON type-checked rules for hooks (fast).
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
  ],
  languageOptions: {
    parserOptions: {
      // keep fast for hooks; type-aware runs can happen in CI instead
      project: null,
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-require-imports': 'warn',
    'no-console': 'warn',
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

export default [...base, typed, cli, tests];
