import { lintTemplate } from '../publish/StaticVerifier';

describe('lintTemplate', () => {
  it('passes valid manifest', () => {
    const manifest = { dp: true, kMin: 30 };
    expect(lintTemplate(manifest, 'SELECT 1')).toEqual({ ok: true });
  });

  it('rejects low k', () => {
    expect(() => lintTemplate({ dp: true, kMin: 10 }, '')).toThrow('kmin_too_low');
  });
});
