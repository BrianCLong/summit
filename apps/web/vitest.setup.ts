/**
 * Vitest setup file
 * Sets up testing environment and custom matchers
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from 'vitest-axe/matchers'

// Add vitest-axe matchers (includes toBeInTheDocument and other jest-dom matchers)
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})
