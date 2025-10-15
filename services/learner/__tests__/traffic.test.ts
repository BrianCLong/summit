import { chooseArm } from '../traffic';

describe('chooseArm', () => {
  const baseState = {
    champion: 'gpt-4.1',
    challenger: 'gpt-4.1-mini',
    split: 0.25,
  } as const;

  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('returns the challenger when the random draw is below the split threshold', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    const result = chooseArm('routing', 'maestro', { ...baseState });

    expect(result).toBe(baseState.challenger);
  });

  it('falls back to the champion when the random draw exceeds the split', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    const result = chooseArm('routing', 'maestro', { ...baseState });

    expect(result).toBe(baseState.champion);
  });

  it('always returns the champion when no challenger is configured', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);

    const result = chooseArm('routing', 'maestro', {
      champion: baseState.champion,
      split: 0.5,
    });

    expect(result).toBe(baseState.champion);
  });
});
