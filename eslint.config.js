import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import securityPlugin from 'eslint-plugin-security';

const sharedTypeScriptRules = {
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  'no-eval': 'error',
  'security/detect-eval-with-expression': 'error',
  'security/detect-object-injection': 'off',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/.docusaurus/**',
      '**/*.cjs',
      '**/*.mjs',
      '**/*.js',
      'coverage/**',
      'docs-site/**',
      'docs/**',
      'scripts/**',
      'tests/**',
      'tmp/**',
      'public/**',
      '.github/workflows/compliance-automation.yml',
    ],
  },
  {
    name: 'node-typescript',
    files: [
      'server/src/config/env.ts',
      'server/src/config/logger.ts',
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      security: securityPlugin,
    },
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: sharedTypeScriptRules,
  },
  {
    name: 'react-typescript',
    files: [
      'client/src/components/ComplianceBoard.tsx',
      'client/src/layout/AppHeader.tsx',
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      security: securityPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...sharedTypeScriptRules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    name: 'store-typescript',
    files: ['client/src/store/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      security: securityPlugin,
    },
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: sharedTypeScriptRules,
  },
  {
    name: 'tests-relaxed',
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
);