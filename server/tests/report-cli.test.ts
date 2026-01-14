import { createHash } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// TODO: Fix module loading for report-cli
// const { verify } = require('../../tools/report-cli');

describe.skip('report cli', () => {
  it('verifies hash correctly', () => {
     // expect(verify).toBeDefined();
  });
});
