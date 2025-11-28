/**
 * Test Setup
 * Configure test environment
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.subtle for Node.js environment
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('crypto');
  globalThis.crypto = webcrypto as unknown as Crypto;
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({}),
    getRegistrations: vi.fn().mockResolvedValue([]),
  },
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  databases: vi.fn().mockResolvedValue([]),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: mockIndexedDB,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: localStorageMock,
});

// Mock navigator.credentials
Object.defineProperty(navigator, 'credentials', {
  writable: true,
  value: {
    get: vi.fn(),
    create: vi.fn(),
  },
});

// Mock PublicKeyCredential
(globalThis as any).PublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false),
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
