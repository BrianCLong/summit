import { evaluateQueries, shouldKill } from '../src/index';

describe('cost guard', () => {
  it('kills when cost exceeds budget respecting margin', () => {
    expect(shouldKill(101, 100)).toBe(true);
    expect(shouldKill(95, 100, { margin: 10 })).toBe(false);
  });

  it('enforces allow/kill lists', () => {
    const verdict = evaluateQueries(
      [
        { id: 'safe', cost: 50 },
        { id: 'expensive', cost: 200 }
      ],
      100,
      { allowList: ['safe'], killList: ['expensive'] }
    );
    expect(verdict.kill).toEqual(['expensive']);
    expect(verdict.allow).toEqual(['safe']);
  });
});
