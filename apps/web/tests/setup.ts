// =============================================
// Vitest Test Setup
// =============================================
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from 'jest-axe/dist/matchers'

// Extend Vitest's expect with jest-axe matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Add custom matchers for TypeScript
declare global {
  namespace Vi {
    interface Matchers<R = any> {
      toHaveNoViolations(): R
    }
  }
}
