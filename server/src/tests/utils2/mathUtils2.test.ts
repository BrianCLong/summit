import { subtract, divide } from './mathUtils2';

describe('Math Utils 2', () => {
  it('should subtract two numbers correctly', () => {
    expect(subtract(5, 3)).toBe(2);
    expect(subtract(0, 5)).toBe(-5);
    expect(subtract(-2, -3)).toBe(1);
  });

  it('should divide two numbers correctly', () => {
    expect(divide(10, 2)).toBe(5);
    expect(divide(7, 2)).toBe(3.5);
    expect(divide(-6, 3)).toBe(-2);
  });

  it('should throw error when dividing by zero', () => {
    expect(() => divide(5, 0)).toThrow('Division by zero');
  });
});
