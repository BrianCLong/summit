module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'security'
      ]
    ],
    'scope-case': [
      2,
      'always',
      [
        'lower-case',
        'kebab-case'
      ]
    ],
    'subject-empty': [
      2,
      'never'
    ],
    'subject-full-stop': [
      2,
      'never',
      '.'
    ],
    'header-max-length': [
      2,
      'always',
      100
    ]
  }
};