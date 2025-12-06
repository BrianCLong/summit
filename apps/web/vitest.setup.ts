/**
 * Vitest setup file
 * Sets up testing environment and custom matchers
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import * as axeMatchers from 'vitest-axe/matchers'

// Add jest-dom matchers (toBeInTheDocument, toBeVisible, etc.)
expect.extend(matchers)

// Add vitest-axe accessibility matchers
expect.extend(axeMatchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})
