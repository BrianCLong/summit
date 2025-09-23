export type Alert = {
  id: string;
  ruleId: string;
  tenantId: string;
  severity: string;
  message: string;
  at: string;
  acked: boolean;
  dedupeKey?: string;
  meta?: any;
};

export class AlertsStore {
  private alerts: Alert[] = [];

  create(alert: Omit<Alert, 'id' | 'acked'>) {
    const a: Alert = { id: Math.random().toString(36).slice(2), acked: false, ...alert };
    this.alerts.push(a);
    return a;
  }

  list() {
    return this.alerts;
  }

  ack(id: string) {
    const a = this.alerts.find((x) => x.id === id);
    if (a) {
      a.acked = true;
    }
    return a;
  }
}
