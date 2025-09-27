export type FlagDecision = {
  key: string;
  value: boolean | string | number;
  reason: string;
  actor?: string;
  at: string;
};

export interface FlagStore {
  get(k: string): Promise<any>;
  set(k: string, v: any): Promise<void>;
}

export class FlagService {
  constructor(private store: FlagStore) {}

  async eval<T = boolean>(tenantId: string, key: string): Promise<T> {
    const def = await this.store.get(`${tenantId}:${key}`);
    return (def?.value ?? false) as T;
  }

  async setFlag(tenantId: string, key: string, value: any) {
    const decision: FlagDecision = {
      key,
      value,
      reason: 'set',
      at: new Date().toISOString(),
    };
    await this.store.set(`${tenantId}:${key}`, decision);
    return decision;
  }
}
