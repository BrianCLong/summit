import { makeDeterministicId, makeEphemeralId } from '../ids';

describe('durable work id helpers', () => {
  it('creates deterministic ids from the same seed', () => {
    const first = makeDeterministicId('convoy:alpha');
    const second = makeDeterministicId('convoy:alpha');

    expect(first).toEqual(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('creates different ids for different seeds', () => {
    const first = makeDeterministicId('convoy:alpha');
    const second = makeDeterministicId('convoy:bravo');

    expect(first).not.toEqual(second);
  });

  it('creates ephemeral ids for wisps', () => {
    const id = makeEphemeralId();

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
