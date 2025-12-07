/**
 * Type declarations for Vitest custom matchers
 * Extends Vitest Assertion type with jest-dom and vitest-axe matchers
 */

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { AxeMatchers } from 'vitest-axe/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<typeof expect.stringContaining, T>, AxeMatchers {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<typeof expect.stringContaining, unknown> {}
}
