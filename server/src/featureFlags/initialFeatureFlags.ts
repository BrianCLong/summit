// server/src/featureFlags/initialFeatureFlags.ts

import { FeatureFlag } from './types.js';

export const initialFeatureFlags: FeatureFlag[] = [
  {
    key: 'new-dashboard-layout',
    enabled: false,
    type: 'boolean',
    description: 'Enable the new dashboard layout with improved UX',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 0,
    targetGroups: ['beta-testers'],
    environment: ['development', 'staging']
  },
  {
    key: 'advanced-search-enabled',
    enabled: true,
    type: 'boolean',
    description: 'Enable advanced search functionality',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 100,
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'ai-powered-insights',
    enabled: false,
    type: 'boolean',
    description: 'Enable AI-powered insights and recommendations',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 5,
    targetGroups: ['premium-users', 'enterprise'],
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'dark-mode',
    enabled: true,
    type: 'boolean',
    description: 'Allow users to toggle dark mode',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 100,
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'multi-factor-auth',
    enabled: true,
    type: 'boolean',
    description: 'Enable multi-factor authentication options',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 100,
    environment: ['staging', 'production'],
    killSwitch: true // Can be toggled via kill switch in emergency
  },
  {
    key: 'api-rate-limit',
    enabled: true,
    value: 1000,
    type: 'number',
    description: 'Number of requests allowed per hour',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'feature-flags-ui',
    enabled: true,
    type: 'boolean',
    description: 'Enable feature flags management UI for admins',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    environment: ['development', 'staging']
  },
  {
    key: 'real-time-notifications',
    enabled: true,
    type: 'boolean',
    description: 'Enable real-time notifications via WebSocket',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 100,
    environment: ['development', 'staging', 'production']
  },
  {
    key: 'features.evidenceTrailPeek',
    enabled: true,
    type: 'boolean',
    description: 'Enable the Evidence-Trail Peek overlay for answer verification',
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    rolloutPercentage: 100,
    environment: ['development', 'staging']
  }
];
