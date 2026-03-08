import { requireReason } from '../src/middleware/rfa';

describe('reason-for-access middleware', () => {
  it('blocks restricted without reason', () => {
    const mw = requireReason(['sensitivity:restricted']);
    const req: any = { headers: {} };
    const res: any = {
      status: (c: number) => ({ json: (x: any) => ({ c, x }) }),
    };
    const next = jest.fn();
    const out = mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(out).toBeDefined();
  });
});
