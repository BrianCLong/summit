"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WFQ = void 0;
class WFQ {
    tenants;
    vtime = 0; // virtual time
    last = {};
    constructor(tenants) {
        this.tenants = tenants;
    }
    ticket(tenantId, cost = 1) {
        const w = this.tenants.find((t) => t.id === tenantId)?.weight || 1;
        const tlast = this.last[tenantId] || 0;
        const finish = Math.max(this.vtime, tlast) + cost / w; // virtual finish time
        this.last[tenantId] = finish;
        return finish;
    }
    pick(queue) {
        const scored = queue.map((j) => ({
            ...j,
            f: this.ticket(j.tenantId, j.cost),
        }));
        const best = scored.sort((a, b) => a.f - b.f)[0];
        this.vtime = best.f;
        return best;
    }
}
exports.WFQ = WFQ;
