import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
(globalThis as any).TextEncoder = TextEncoder;
(globalThis as any).TextDecoder = TextDecoder as any;
(globalThis as any).import = (globalThis as any).import || {};
(globalThis as any).import.meta = (globalThis as any).import.meta || { env: {} };
(globalThis as any).import.meta.env = {
  ...(globalThis as any).import.meta.env,
  VITE_AGENT_SESSION_EXPLORER_ENABLED: 'true',
};
