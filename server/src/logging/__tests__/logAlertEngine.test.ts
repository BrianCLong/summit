import { logEventBus } from '../logEventBus.js';
import { LogAlertEngine } from '../logAlertEngine.js';

describe('LogAlertEngine', () => {
  it('triggers an alert when threshold is exceeded', (done) => {
    logEventBus.reset();

    const engine = new LogAlertEngine([
      {
        id: 'test-error-burst',
        name: 'Test rule',
        level: 'error',
        windowSeconds: 5,
        threshold: 2,
      },
    ]);

    engine.attach(logEventBus);

    engine.on('alert', (alert) => {
      expect(alert.ruleId).toBe('test-error-burst');
      expect(alert.events).toHaveLength(2);
      done();
    });

    logEventBus.publish({ level: 'error', message: 'first' });
    logEventBus.publish({ level: 'error', message: 'second' });
  });
});
