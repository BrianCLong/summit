interface Entry<T> {
  key: string;
  value: T;
}

export class DecisionCache<T> {
  private store: Entry<T>[] = [];
  constructor(private max = 100) {}

  private makeKey(tenantId: string, key: string) {
    return `${tenantId}:${key}`;
  }

  get(tenantId: string, key: string): T | undefined {
    const k = this.makeKey(tenantId, key);
    const idx = this.store.findIndex(e => e.key === k);
    if (idx >= 0) {
      const [e] = this.store.splice(idx, 1);
      this.store.unshift(e);
      return e.value;
    }
  }

  set(tenantId: string, key: string, value: T) {
    const k = this.makeKey(tenantId, key);
    this.store = this.store.filter(e => e.key !== k);
    this.store.unshift({ key: k, value });
    if (this.store.length > this.max) this.store.pop();
  }
}
