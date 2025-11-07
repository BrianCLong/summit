import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node test environment
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  // @ts-expect-error - Node typings accept constructor arguments
  global.TextDecoder = TextDecoder;
}
