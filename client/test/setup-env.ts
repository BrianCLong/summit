// Optional DOM matchers if @testing-library is present
try {
  require('@testing-library/jest-dom');
} catch {}

// TextEncoder/Decoder shim (mostly redundant on Node 20 but safe)
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder ??= TextEncoder;
(global as any).TextDecoder ??= TextDecoder as any;
