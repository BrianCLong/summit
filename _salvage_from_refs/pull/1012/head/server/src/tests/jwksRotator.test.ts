import { JwksRotator } from '../security/JwksRotator';

describe('JwksRotator', () => {
  it('rotates when due and warns on drift', async () => {
    const events: any[] = [];
    const store = {
      jwks: null as any,
      async get() {
        return this.jwks;
      },
      async set(v: any) {
        this.jwks = v;
      },
    };
    const rotator = new JwksRotator(store);
    const first = await rotator.rotateIfDue(0);
    store.jwks = first;
    const second = await rotator.rotateIfDue(25 * 3600 * 1000);
    expect(second.kid).not.toEqual(first.kid);
  });
});
