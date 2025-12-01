/**
 * ESLint Complexity Rules Configuration
 *
 * This configuration enforces maintainability metrics for the codebase.
 * These rules are based on industry standards and the current codebase analysis.
 */

module.exports = {
  extends: ['./eslint.config.mjs'],
  plugins: ['complexity'],
  rules: {
    // Cyclomatic Complexity - Maximum number of independent paths through code
    // Current issues: Files with 100+ conditionals found
    'complexity': ['error', { max: 15 }], // Industry standard: 10-15, we start at 15

    // Maximum function length in lines
    // Current issues: Functions over 200 lines found
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'max-lines-per-function': ['error', {
      max: 100,
      skipBlankLines: true,
      skipComments: true,
      IIFEs: true,
    }],

    // Maximum file length
    // Current issues: 71 files over 1000 lines, 4 files over 2000 lines
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'max-lines': ['error', {
      max: 500,
      skipBlankLines: true,
      skipComments: true,
    }],

    // Maximum depth of nested callbacks/blocks
    // Prevents deeply nested code that's hard to follow
    'max-depth': ['error', { max: 4 }],

    // Maximum number of nested callbacks
    'max-nested-callbacks': ['error', { max: 3 }],

    // Maximum number of parameters
    // God Objects often have methods with too many parameters
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'max-params': ['error', { max: 5 }],

    // Maximum number of statements per line
    'max-statements-per-line': ['error', { max: 1 }],

    // Maximum number of statements in a function
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'max-statements': ['error', { max: 30 }, { ignoreTopLevelFunctions: false }],

    // Cognitive Complexity - Measures how difficult code is to understand
    // More strict than cyclomatic complexity
    'sonarjs/cognitive-complexity': ['error', 15],

    // Prevent duplicate code
    'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],
    'sonarjs/no-identical-functions': 'error',

    // Class/Object design
    'max-classes-per-file': ['error', 1],

    // Switch statement complexity
    // Current issues: Switch statements with 32 cases found
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'max-cases-per-switch': ['error', 10],

    // Import management
    // Current issues: Files with 33+ imports found
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'import/max-dependencies': ['error', { max: 20 }],

    // Code organization
    // ENFORCED: Changed from 'warn' to 'error' for CI enforcement
    'no-magic-numbers': ['error', {
      ignore: [0, 1, -1],
      ignoreArrayIndexes: true,
      enforceConst: true,
    }],

    // Prevent overly complex boolean expressions
    'no-mixed-operators': 'error',

    // Encourage early returns to reduce nesting
    'no-else-return': ['error', { allowElseIf: false }],

    // TODO/FIXME management
    // Current issues: 194 TODOs across the codebase
    'no-warning-comments': ['warn', {
      terms: ['TODO', 'FIXME', 'XXX', 'HACK'],
      location: 'start',
    }],
  },
};
