import baseConfig from './eslint.config.mjs';

// If eslint-plugin-sonarjs is ever added, we can import and use it here.
// import sonarjs from 'eslint-plugin-sonarjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Cyclomatic Complexity
      'complexity': ['warn', { max: 20 }], // Relaxed to warn/20

      // Maximum function length
      'max-lines-per-function': ['warn', {
        max: 200, // Relaxed from 100
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      }],

      // Maximum file length
      'max-lines': ['warn', {
        max: 1000, // Relaxed from 500
        skipBlankLines: true,
        skipComments: true,
      }],

      // Maximum depth
      'max-depth': ['warn', { max: 5 }],

      // Maximum nested callbacks
      'max-nested-callbacks': ['warn', { max: 4 }],

      // Maximum parameters
      'max-params': ['warn', { max: 7 }], // Relaxed from 5

      // Max statements per line
      'max-statements-per-line': ['warn', { max: 1 }],

      // Max statements per function
      'max-statements': ['warn', { max: 50 }, { ignoreTopLevelFunctions: false }],

      // Note: sonarjs rules removed as plugin is missing

      // Class design
      'max-classes-per-file': ['warn', 1],

      // Switch complexity
      'max-cases-per-switch': ['warn', 20],

      // Import management (import plugin is present in base config)
      'import/max-dependencies': ['warn', { max: 25 }],

      // Magic numbers
      'no-magic-numbers': ['off'], // Too noisy for legacy code

      // Mixed operators
      'no-mixed-operators': 'warn',

      // Early return
      'no-else-return': ['warn', { allowElseIf: false }],

      // TODO comments
      'no-warning-comments': ['warn', {
        terms: ['TODO', 'FIXME', 'XXX', 'HACK'],
        location: 'start',
      }],
    }
  }
];
