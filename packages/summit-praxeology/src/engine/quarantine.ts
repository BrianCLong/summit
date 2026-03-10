export type QuarantinedPGWriteSet = {
  id: string;
  receivedAt: string;
  raw: unknown;
  validation: unknown;
};

export class InMemoryPGQuarantine {
  private readonly items = new Map<string, QuarantinedPGWriteSet>();

  put(item: QuarantinedPGWriteSet) {
    this.items.set(item.id, item);
    return item;
  }

  get(id: string) {
    return this.items.get(id) ?? null;
  }

  list() {
    return Array.from(this.items.values());
  }
}
