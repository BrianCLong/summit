import { AlertsStore } from '../src/alerts/AlertsStore';

describe('AlertsStore', () => {
  it('acks alerts', () => {
    const store = new AlertsStore();
    const alert = store.create({
      ruleId: 'r1',
      tenantId: 't',
      severity: 'low',
      message: 'hi',
      at: new Date().toISOString(),
    });
    expect(store.ack(alert.id)?.acked).toBe(true);
  });
});
