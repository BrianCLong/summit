/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'

import { designTokenRestrictions } from '../../tools/eslint/design-token-restrictions'

const baseConfig = {
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
  rules: {
    'no-restricted-syntax': ['error', ...designTokenRestrictions],
  },
} as const

const lint = (source: string) => {
  const linter = new Linter({ configType: 'flat' })
  return linter.verify(source, baseConfig)
}

describe('design token lint guardrails', () => {
  it('flags literal spacing and radii values', () => {
    const messages = lint(
      `
        const styles = {
          padding: "12px",
          borderRadius: 6
        }
      `
    )

    expect(messages).toHaveLength(2)
    expect(messages[0].message).toContain('design tokens')
  })

  it('allows css variable based tokens', () => {
    const messages = lint(
      `
        const styles = {
          padding: "var(--ds-space-md)",
          borderRadius: "var(--ds-radius-lg)",
          boxShadow: \`0 0 0 var(--ds-space-xs) var(--ds-shadow-sm)\`
        }
      `
    )

    expect(messages).toHaveLength(0)
  })
})
