import { precheck, ALLOW_TYPES, MAX_SIZE } from '../../src/threat/ingest/precheck';
import { Buffer } from 'node:buffer';

describe('precheck', () => {
  it('allows permitted type and size', () => {
    const res = precheck({
      mimetype: ALLOW_TYPES[0],
      size: 1024,
      buffer: Buffer.from('test')
    });
    expect(res.allowed).toBe(true);
    expect(res.flags).toHaveLength(0);
  });

  it('blocks disallowed type', () => {
    const res = precheck({
      mimetype: 'application/zip',
      size: 1024,
      buffer: Buffer.from('test')
    });
    expect(res.allowed).toBe(false);
    expect(res.flags).toContain('disallowed-type');
  });

  it('blocks oversize file', () => {
    const res = precheck({
      mimetype: ALLOW_TYPES[0],
      size: MAX_SIZE + 1,
      buffer: Buffer.from('test')
    });
    expect(res.allowed).toBe(false);
    expect(res.flags).toContain('file-too-large');
  });
});
