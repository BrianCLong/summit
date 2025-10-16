import { capitalize, reverse } from './stringUtils';

describe('String Utils', () => {
  it('should capitalize the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
    expect(capitalize('')).toBe('');
  });

  it('should reverse a string', () => {
    expect(reverse('hello')).toBe('olleh');
    expect(reverse('world')).toBe('dlrow');
    expect(reverse('')).toBe('');
  });
});
