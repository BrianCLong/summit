/**
 * Security-focused ESLint Configuration
 *
 * This configuration enforces security best practices including:
 * - Detection of common security vulnerabilities
 * - Prevention of insecure patterns
 * - Code quality checks that impact security
 */

module.exports = {
  plugins: [
    'security',
    'no-unsanitized'
  ],
  extends: [
    'plugin:security/recommended'
  ],
  rules: {
    // Security Plugin Rules
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',

    // No Unsanitized Plugin Rules
    'no-unsanitized/method': 'error',
    'no-unsanitized/property': 'error',

    // TypeScript ESLint Security Rules
    '@typescript-eslint/no-implied-eval': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // Standard ESLint Security Rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-return-assign': 'error',
    'no-param-reassign': ['error', { props: false }],

    // Prevent dangerous patterns
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',

    // Enforce secure coding patterns
    'eqeqeq': ['error', 'always'],
    'strict': ['error', 'global'],
    'no-var': 'error',
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
      rules: {
        // Relax some security rules in test files
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-child-process': 'off',
        'no-console': 'off',
      }
    }
  ]
};
