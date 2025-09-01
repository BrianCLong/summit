export class AlertsStore {
    constructor() {
        this.alerts = [];
    }
    create(alert) {
        const a = { id: Math.random().toString(36).slice(2), acked: false, ...alert };
        this.alerts.push(a);
        return a;
    }
    list() {
        return this.alerts;
    }
    ack(id) {
        const a = this.alerts.find((x) => x.id === id);
        if (a) {
            a.acked = true;
        }
        return a;
    }
}
//# sourceMappingURL=AlertsStore.js.map