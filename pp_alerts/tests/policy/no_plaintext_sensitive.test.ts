import { validate } from '../../src/policy/no_plaintext_sensitive';

describe('No Plaintext Sensitive Gate', () => {
  it('should accept clean payload', () => {
    const payload = {
      id: 'abc',
      data: {
        score: 10,
        tags: ['a', 'b']
      }
    };
    expect(() => validate(payload)).not.toThrow();
  });

  it('should reject top-level sensitive key', () => {
    const payload = {
      src_ip: '1.2.3.4',
      other: 'value'
    };
    expect(() => validate(payload)).toThrow(/matched src_ip/);
  });

  it('should reject nested sensitive key', () => {
    const payload = {
      meta: {
        user: {
          email: 'test@example.com'
        }
      }
    };
    expect(() => validate(payload)).toThrow(/meta\.user\.email.*matched email/);
  });

  it('should reject mixed content', () => {
    const payload = {
      safe: 'val',
      payload: 'secret'
    };
    expect(() => validate(payload)).toThrow(/matched payload/);
  });
});
