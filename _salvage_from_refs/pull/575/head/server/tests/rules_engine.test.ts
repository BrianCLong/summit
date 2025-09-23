import { RulesEngine, Rule } from '../src/rules/RulesEngine';
import { AlertsStore } from '../src/alerts/AlertsStore';

describe('RulesEngine', () => {
  it('dedupes alerts within cooldown', () => {
    const alerts = new AlertsStore();
    const engine = new RulesEngine(alerts);
    const rule: Rule = {
      id: 'r1',
      name: 'test',
      enabled: true,
      severity: 'low',
      when: {
        type: 'counter',
        expr: 'x',
        threshold: 1,
        dedupeKey: 'a',
        cooldownMs: 1000,
      },
      then: { action: 'alert', message: 'hi' },
    };
    engine.observeCounter(rule, 1);
    engine.observeCounter(rule, 1);
    expect(alerts.list().length).toBe(1);
  });
});
