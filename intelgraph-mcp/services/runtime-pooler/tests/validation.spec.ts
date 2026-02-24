import { describe, expect, it } from 'vitest';
import {
  parseRpcMethod,
  parseSessionId,
  parseToolClass,
} from '../src/validation';

describe('runtime validation', () => {
  it('accepts safe tool classes and rpc methods', () => {
    expect(parseToolClass('echo')).toBe('echo');
    expect(parseRpcMethod('mcp.ping')).toBe('mcp.ping');
  });

  it('rejects unsafe path-like values', () => {
    expect(() => parseToolClass('../escape')).toThrow();
    expect(() => parseRpcMethod('invoke/../../etc/passwd')).toThrow();
  });

  it('validates scheduler session ids', () => {
    expect(parseSessionId('sess_123e4567-e89b-12d3-a456-426614174000')).toBe(
      'sess_123e4567-e89b-12d3-a456-426614174000',
    );
    expect(() => parseSessionId('sess_bad')).toThrow();
  });
});
