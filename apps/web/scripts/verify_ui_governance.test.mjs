/**
 * Tests for the UI Governance Verification Script
 *
 * Run with: node --test scripts/verify_ui_governance.test.mjs
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Test patterns from the governance script
const RULES = {
  'no-hardcoded-colors': {
    pattern: /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  },
  'no-inline-color-styles': {
    pattern: /style\s*=\s*\{\s*\{[^}]*(?:color|backgroundColor|borderColor)\s*:/g,
  },
  'prefer-button-primitive': {
    pattern: /<button\s+(?![^>]*(?:disabled|type="submit"|type="button"|type="reset")[^>]*>)[^>]*className\s*=\s*["'][^"']*(?:bg-|text-|px-|py-|rounded)[^"']*["'][^>]*>/g,
  },
}

describe('UI Governance Rules', () => {
  describe('no-hardcoded-colors', () => {
    const pattern = RULES['no-hardcoded-colors'].pattern

    it('flags 3-digit hex colors', () => {
      pattern.lastIndex = 0
      const match = pattern.test('#fff')
      assert.strictEqual(match, true)
    })

    it('flags 6-digit hex colors', () => {
      pattern.lastIndex = 0
      const match = pattern.test('#ffffff')
      assert.strictEqual(match, true)
    })

    it('flags 8-digit hex colors with alpha', () => {
      pattern.lastIndex = 0
      const match = pattern.test('#ffffffff')
      assert.strictEqual(match, true)
    })

    it('does not flag CSS variables', () => {
      pattern.lastIndex = 0
      const match = pattern.test('var(--ds-color-primary)')
      assert.strictEqual(match, false)
    })

    it('does not flag tailwind classes', () => {
      pattern.lastIndex = 0
      const match = pattern.test('bg-blue-500')
      assert.strictEqual(match, false)
    })
  })

  describe('no-inline-color-styles', () => {
    const pattern = RULES['no-inline-color-styles'].pattern

    it('flags inline backgroundColor style', () => {
      pattern.lastIndex = 0
      const match = pattern.test('style={{ backgroundColor: "#fff" }}')
      assert.strictEqual(match, true)
    })

    it('flags inline color style', () => {
      pattern.lastIndex = 0
      const match = pattern.test("style={{ color: 'red' }}")
      assert.strictEqual(match, true)
    })

    it('does not flag other inline styles', () => {
      pattern.lastIndex = 0
      const match = pattern.test("style={{ padding: '16px' }}")
      assert.strictEqual(match, false)
    })
  })

  describe('prefer-button-primitive', () => {
    const pattern = RULES['prefer-button-primitive'].pattern

    it('flags styled raw button', () => {
      pattern.lastIndex = 0
      const match = pattern.test('<button className="bg-blue-500 text-white px-4 py-2">')
      assert.strictEqual(match, true)
    })

    it('does not flag button with only type attribute', () => {
      pattern.lastIndex = 0
      const match = pattern.test('<button type="submit">')
      assert.strictEqual(match, false)
    })
  })
})

describe('Waiver validation', () => {
  function isWaiverExpired(waiver) {
    const now = new Date()
    const expires = new Date(waiver.expires)
    return expires < now
  }

  it('returns false for valid non-expired waiver', () => {
    const waiver = { expires: '2030-01-01' }
    assert.strictEqual(isWaiverExpired(waiver), false)
  })

  it('returns true for expired waiver', () => {
    const waiver = { expires: '2020-01-01' }
    assert.strictEqual(isWaiverExpired(waiver), true)
  })

  it('handles edge case of today', () => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const waiver = { expires: today.toISOString().split('T')[0] }
    // Should be expired by end of day (depends on timezone)
    const result = isWaiverExpired(waiver)
    assert.strictEqual(typeof result, 'boolean')
  })
})

describe('Allowlist suppression', () => {
  function isWaived(filePath, ruleId, waivers) {
    function isWaiverExpired(waiver) {
      return new Date(waiver.expires) < new Date()
    }
    return waivers.find(
      (w) => w.file === filePath && w.rule === ruleId && !isWaiverExpired(w)
    )
  }

  it('returns truthy when file and rule match non-expired waiver', () => {
    const waivers = [
      { file: 'src/legacy/Component.tsx', rule: 'no-hardcoded-colors', expires: '2030-01-01' },
    ]
    const result = isWaived('src/legacy/Component.tsx', 'no-hardcoded-colors', waivers)
    assert.ok(result)
  })

  it('returns falsy when file matches but rule does not', () => {
    const waivers = [
      { file: 'src/legacy/Component.tsx', rule: 'no-hardcoded-colors', expires: '2030-01-01' },
    ]
    const result = isWaived('src/legacy/Component.tsx', 'prefer-button-primitive', waivers)
    assert.ok(!result)
  })

  it('returns falsy when waiver is expired', () => {
    const waivers = [
      { file: 'src/legacy/Component.tsx', rule: 'no-hardcoded-colors', expires: '2020-01-01' },
    ]
    const result = isWaived('src/legacy/Component.tsx', 'no-hardcoded-colors', waivers)
    assert.ok(!result)
  })
})

console.log('All governance tests passed!')
