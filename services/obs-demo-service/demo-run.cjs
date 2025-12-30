const { withTelemetryContext, startSpan, log } = require('./obs-sdk.cjs');

withTelemetryContext({ actor: 'analyst-1', customer_id: 'cust-123', decision_id: 'dec-999' }, () => {
  startSpan('demo.root', { feature: 'observability-kit' }, () => {
    log('info', 'demo.log', { step: 'before-child' });
    return startSpan('demo.child', { step: 'child-work' }, () => {
      log('info', 'demo.child.log', { detail: 'child doing work' });
    });
  });
});
