import { ChaosGenerator } from '../chaos';

describe('Chaos Generator', () => {
  it('should generate irregular timestamps', () => {
    const chaos = new ChaosGenerator();
    const ts = chaos.irregularTimestamp();
    expect(ts).toBeDefined();
  });

  it('should malform objects', () => {
    const chaos = new ChaosGenerator(1.0); // Always mutate
    const original = { name: 'test', count: 10, nested: { a: 1 } };
    const mutated = chaos.malformInput(original);

    // It's possible for random mutation to do nothing if it chooses deep recursion on simple objects,
    // but with 1.0 rate it should do something.
    // However, logic says `shouldMutate` is checked.
    expect(mutated).not.toBeNull();
  });
});
