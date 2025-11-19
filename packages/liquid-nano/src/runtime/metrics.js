export class InMemoryMetricsRegistry {
    metrics = new Map();
    recordCounter(name, value = 1) {
        const existing = this.metrics.get(name);
        if (existing && existing.type === 'counter') {
            existing.value += value;
            return;
        }
        this.metrics.set(name, { type: 'counter', value });
    }
    recordGauge(name, value) {
        const existing = this.metrics.get(name);
        if (existing && existing.type === 'gauge') {
            existing.value = value;
            return;
        }
        this.metrics.set(name, { type: 'gauge', value });
    }
    recordDuration(name, durationMs) {
        const existing = this.metrics.get(name);
        if (existing && existing.type === 'duration') {
            existing.count += 1;
            existing.total += durationMs;
            return;
        }
        this.metrics.set(name, { type: 'duration', count: 1, total: durationMs });
    }
    snapshot() {
        const view = {};
        for (const [key, metric] of this.metrics.entries()) {
            if (metric.type === 'counter' || metric.type === 'gauge') {
                view[key] = metric.value;
            }
            else {
                view[`${key}.avg`] = metric.total / metric.count;
                view[`${key}.count`] = metric.count;
            }
        }
        return view;
    }
}
export function createMetricsRegistry() {
    return new InMemoryMetricsRegistry();
}
