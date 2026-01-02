import { MemoryStore } from '../src/index';

describe('MemoryStore', () => {
  it('should store and retrieve values', () => {
    const store = new MemoryStore();
    store.set('key', 'value');
    expect(store.get('key')).toBe('value');
  });

  it('should redact sensitive information', () => {
    const store = new MemoryStore();
    store.set('secret', 'my password is 123');
    expect(store.get('secret')).toBe('[REDACTED]');

    store.set('user', { name: 'Alice', password: '123' });
    expect(store.get('user')).toEqual({ name: 'Alice', password: '[REDACTED]' });
  });
});
