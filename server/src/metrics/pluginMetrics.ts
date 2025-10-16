import { Counter } from 'prom-client';
import { registry } from './registry.js';

export const pluginInvocations = new Counter({
  name: 'plugin_invocations_total',
  help: 'Total plugin invocations',
  labelNames: ['plugin', 'status', 'tenant'] as const,
  registers: [registry],
});

export const pluginErrors = new Counter({
  name: 'plugin_errors_total',
  help: 'Total plugin errors',
  labelNames: ['plugin', 'tenant'] as const,
  registers: [registry],
});
