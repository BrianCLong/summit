import { shouldKill } from '../src/index';
it('kills when cost exceeds budget', () => {
  expect(shouldKill(101, 100)).toBe(true);
});
