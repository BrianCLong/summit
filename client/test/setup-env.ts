import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

// TextEncoder/Decoder shim (mostly redundant on Node 20 but safe)
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder ??= TextEncoder;
(global as any).TextDecoder ??= TextDecoder as any;

expect.extend({ toHaveNoViolations });

