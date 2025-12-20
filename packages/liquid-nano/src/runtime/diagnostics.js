const MAX_EVENTS = 500;
export class RingDiagnosticsTimeline {
    events = [];
    push(entry) {
        this.events.push(entry);
        if (this.events.length > MAX_EVENTS) {
            this.events.shift();
        }
    }
    last(count = 10) {
        if (count <= 0) {
            return [];
        }
        return this.events.slice(-count);
    }
    summarize() {
        const success = this.events.filter((event) => event.status === 'processed').length;
        const failed = this.events.filter((event) => event.status === 'failed').length;
        const queued = this.events.filter((event) => event.status === 'queued').length;
        return {
            events: [...this.events],
            metrics: {
                'diagnostics.success': success,
                'diagnostics.failed': failed,
                'diagnostics.queued': queued
            }
        };
    }
}
export function createDiagnosticsTimeline() {
    return new RingDiagnosticsTimeline();
}
