/**
 * ESLint JSDoc Configuration
 *
 * This configuration enforces JSDoc documentation standards across the codebase.
 * Add this to your main eslint.config.mjs by importing and spreading it.
 *
 * To enable:
 * 1. Install: pnpm add -D eslint-plugin-jsdoc
 * 2. Import in eslint.config.mjs: import jsdocConfig from './eslint-jsdoc.config.mjs'
 * 3. Add to config array: [...tseslint.configs.recommended, jsdocConfig, ...]
 */

import jsdoc from 'eslint-plugin-jsdoc';

export default {
  plugins: {
    jsdoc,
  },
  rules: {
    // Require JSDoc comments for all exported functions, classes, and types
    'jsdoc/require-jsdoc': [
      'warn',
      {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false, // Only exported ones
          FunctionExpression: false,
        },
        contexts: [
          'ExportNamedDeclaration > FunctionDeclaration',
          'ExportDefaultDeclaration > FunctionDeclaration',
          'ExportNamedDeclaration > ClassDeclaration',
          'ExportDefaultDeclaration > ClassDeclaration',
          'ExportNamedDeclaration > VariableDeclaration',
          'TSInterfaceDeclaration', // Require docs for all interfaces
          'TSTypeAliasDeclaration', // Require docs for all type aliases
        ],
      },
    ],

    // Require description in JSDoc
    'jsdoc/require-description': [
      'warn',
      {
        descriptionStyle: 'body',
        checkConstructors: false,
        checkGetters: true,
        checkSetters: true,
      },
    ],

    // Require @param for all parameters
    'jsdoc/require-param': 'warn',

    // Require parameter descriptions
    'jsdoc/require-param-description': 'warn',

    // Require @returns for functions that return values
    'jsdoc/require-returns': [
      'warn',
      {
        checkGetters: false,
      },
    ],

    // Require return description
    'jsdoc/require-returns-description': 'warn',

    // Check that @param names match function signature
    'jsdoc/check-param-names': 'error',

    // Validate JSDoc types
    'jsdoc/check-types': 'warn',

    // Require valid JSDoc tags
    'jsdoc/check-tag-names': 'error',

    // Ensure proper alignment
    'jsdoc/check-alignment': 'error',

    // Validate indentation
    'jsdoc/check-indentation': 'off', // Can be strict, enable if desired

    // Require examples for complex functions
    'jsdoc/require-example': 'off', // Optional: enable for critical APIs

    // Check for empty JSDoc comments
    'jsdoc/no-blank-blocks': 'warn',

    // Validate @throws tags
    'jsdoc/check-throws': 'warn',

    // Require @throws documentation for thrown errors
    'jsdoc/require-throws': 'off', // Can be enabled if desired

    // Prefer specific types over generic Object
    'jsdoc/no-undefined-types': 'off', // TypeScript handles this

    // Check for multi-line descriptions
    'jsdoc/multiline-blocks': 'warn',

    // Enforce consistent tag formatting
    'jsdoc/tag-lines': ['warn', 'any', { startLines: 1 }],
  },
};
