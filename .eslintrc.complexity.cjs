/**
 * ESLint Complexity Rules Configuration
 *
 * This configuration enforces maintainability metrics for the codebase.
 * Uses only built-in ESLint rules - no external plugins required.
 *
 * Thresholds based on industry standards and current codebase analysis.
 */

module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },

  // Override for TypeScript files
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  ],

  rules: {
    // ===================================
    // COMPLEXITY METRICS
    // ===================================

    // Cyclomatic Complexity - Maximum number of independent paths through code
    // Industry standard: 10-15, we use 15 as starting threshold
    // Current issues: Files with 100+ conditionals found
    complexity: ['warn', { max: 15 }],

    // Maximum function length in lines
    // Current issues: Functions over 200 lines found
    'max-lines-per-function': [
      'warn',
      {
        max: 100,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      },
    ],

    // Maximum file length
    // Current issues: 71 files over 1000 lines, 4 files over 2000 lines
    'max-lines': [
      'warn',
      {
        max: 500,
        skipBlankLines: true,
        skipComments: true,
      },
    ],

    // ===================================
    // NESTING AND STRUCTURE
    // ===================================

    // Maximum depth of nested blocks
    // Prevents deeply nested code that's hard to follow
    'max-depth': ['warn', { max: 4 }],

    // Maximum number of nested callbacks
    'max-nested-callbacks': ['warn', { max: 3 }],

    // ===================================
    // FUNCTION DESIGN
    // ===================================

    // Maximum number of parameters
    // God Objects often have methods with too many parameters
    'max-params': ['warn', { max: 5 }],

    // Maximum number of statements per line
    'max-statements-per-line': ['error', { max: 1 }],

    // Maximum number of statements in a function
    'max-statements': ['warn', { max: 30, ignoreTopLevelFunctions: false }],

    // ===================================
    // CLASS DESIGN
    // ===================================

    // One class per file
    'max-classes-per-file': ['warn', 1],

    // ===================================
    // CODE QUALITY
    // ===================================

    // Prevent overly complex boolean expressions
    'no-mixed-operators': 'warn',

    // Encourage early returns to reduce nesting
    'no-else-return': ['warn', { allowElseIf: false }],

    // ===================================
    // TECHNICAL DEBT TRACKING
    // ===================================

    // Track TODO/FIXME comments
    // Current issues: 194 TODOs across the codebase
    'no-warning-comments': [
      'warn',
      {
        terms: ['TODO', 'FIXME', 'XXX', 'HACK'],
        location: 'start',
      },
    ],

    // ===================================
    // DISABLED RULES
    // ===================================
    // These are disabled to allow the config to run without errors

    'no-unused-vars': 'off',
    'no-undef': 'off',
  },

  // Ignore patterns
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.turbo/',
    '*.min.js',
    '*.bundle.js',
    'generated/',
    '**/*.d.ts',
  ],
};
