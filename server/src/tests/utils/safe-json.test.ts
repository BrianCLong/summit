import { safeJsonParse, safeJsonStringify } from '../../utils/safe-json';

describe('Safe JSON Utilities', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const input = '{"key": "value"}';
      const result = safeJsonParse(input);
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const input = '{invalid}';
      const fallback = { error: true };
      const result = safeJsonParse(input, fallback);
      expect(result).toEqual(fallback);
    });

    it('should return null as default fallback', () => {
      const input = 'not json';
      const result = safeJsonParse(input);
      expect(result).toBeNull();
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify valid objects', () => {
      const input = { key: 'value' };
      const result = safeJsonStringify(input);
      expect(result).toBe('{"key":"value"}');
    });

    it('should handle circular references by returning fallback', () => {
      const circular: any = {};
      circular.self = circular;
      const result = safeJsonStringify(circular, 'fallback');
      expect(result).toBe('fallback');
    });

    it('should return default fallback {} for circular refs', () => {
      const circular: any = {};
      circular.self = circular;
      const result = safeJsonStringify(circular);
      expect(result).toBe('{}');
    });
  });
});
