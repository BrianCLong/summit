export class SubgraphCache {
  constructor(private kv: { get: (k: string) => Promise<string | undefined>; set: (k: string, v: string, ttl: number) => Promise<void>; del?: (k: string) => Promise<void> }) {}

  key(op: string, vars: any) {
    return `sg:${op}:${require('crypto').createHash('md5').update(JSON.stringify(vars)).digest('hex')}`;
  }

  async get(op: string, vars: any) {
    return this.kv.get(this.key(op, vars));
  }

  async set(op: string, vars: any, payload: any, ttl = 60) {
    return this.kv.set(this.key(op, vars), JSON.stringify(payload), ttl);
  }

  async writeThrough(op: string, vars: any, fetcher: () => Promise<any>, ttl = 60) {
    const data = await fetcher();
    await this.set(op, vars, data, ttl);
    return data;
  }

  async invalidate(op: string, vars: any) {
    if (this.kv.del) {
      await this.kv.del(this.key(op, vars));
    }
  }
}
