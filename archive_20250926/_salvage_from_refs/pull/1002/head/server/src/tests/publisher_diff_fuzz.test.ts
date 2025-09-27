import { differencingFuzz } from '../publish/DiffFuzzer';

describe('differencingFuzz', () => {
  it('returns ok when difference within noise bound', async () => {
    const run = async (d: any) => d.records.length;
    const base = { epsilon: 1, records: [{}, {}] };
    await expect(differencingFuzz(run, base)).resolves.toEqual({ ok: true });
  });
});
