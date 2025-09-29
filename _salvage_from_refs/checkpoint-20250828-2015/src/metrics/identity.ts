import client from 'prom-client';

export const reg = new client.Registry();
client.collectDefaultMetrics({ register: reg });

export const ssoLogins = new client.Counter({
  name: 'sso_logins_total', help: 'SSO logins', labelNames: ['provider','orgId'],
});
export const ssoErrors = new client.Counter({
  name: 'sso_errors_total', help: 'SSO errors', labelNames: ['provider','orgId','reason'],
});
export const scimOps = new client.Counter({
  name: 'scim_ops_total', help: 'SCIM operations', labelNames: ['resource','op','orgId','status'],
});
export const approvalsPending = new client.Gauge({
  name: 'access_approvals_pending', help: 'Pending access requests', labelNames: ['orgId'],
});
export const seatsGauge = new client.Gauge({
  name: 'seats_usage', help: 'Seat usage', labelNames: ['orgId','kind'], // kind: total|privileged
});

reg.registerMetric(ssoLogins);
reg.registerMetric(ssoErrors);
reg.registerMetric(scimOps);
reg.registerMetric(approvalsPending);
reg.registerMetric(seatsGauge);
