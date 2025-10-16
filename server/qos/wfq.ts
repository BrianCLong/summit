type Tenant = { id: string; weight: number };
export class WFQ {
  private vtime = 0; // virtual time
  private last: Record<string, number> = {};
  constructor(private tenants: Tenant[]) {}
  ticket(tenantId: string, cost = 1) {
    const w = this.tenants.find((t) => t.id === tenantId)?.weight || 1;
    const tlast = this.last[tenantId] || 0;
    const finish = Math.max(this.vtime, tlast) + cost / w; // virtual finish time
    this.last[tenantId] = finish;
    return finish;
  }
  pick(queue: { tenantId: string; cost: number }[]) {
    const scored = queue.map((j) => ({
      ...j,
      f: this.ticket(j.tenantId, j.cost),
    }));
    const best = scored.sort((a, b) => a.f - b.f)[0];
    this.vtime = best.f;
    return best;
  }
}
