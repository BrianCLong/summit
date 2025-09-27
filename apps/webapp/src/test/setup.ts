import '@testing-library/jest-dom';
import { expect } from '@jest/globals';

void import('@testing-library/jest-dom/matchers').then((module) => {
  const matchers = (module as any).default ?? module;
  expect.extend(matchers as any);
});
import { TextEncoder, TextDecoder } from 'util';
(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder as any;
(globalThis as any).__VITE_IMPORT_META_ENV__ = {};
