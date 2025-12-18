import { Rule } from './types.js';

export const defaultRules: Rule[] = [
  {
    id: 'brute-force-login',
    name: 'Brute Force Login Detection',
    description: 'Detects multiple failed login attempts from the same IP',
    severity: 'high',
    enabled: true,
    windowSeconds: 60,
    threshold: 5,
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'login_failed' }
    ],
    actions: [{ type: 'alert' }]
  },
  {
    id: 'root-access',
    name: 'Root/Admin Access',
    description: 'Detects access to sensitive admin endpoints',
    severity: 'critical',
    enabled: true,
    windowSeconds: 10,
    threshold: 1,
    conditions: [
      { field: 'eventType', operator: 'equals', value: 'admin_access' }
    ],
    actions: [{ type: 'alert' }]
  },
  {
      id: 'impossible-travel',
      name: 'Impossible Travel',
      description: 'Detects logins from different locations in short timeframe',
      severity: 'high',
      enabled: true,
      windowSeconds: 300,
      threshold: 1, // Logic handled in engine for this specific type, or simulated via events
      conditions: [
          { field: 'eventType', operator: 'equals', value: 'impossible_travel_detected'}
      ],
      actions: [{ type: 'alert' }, { type: 'block_user' }]
  }
];
