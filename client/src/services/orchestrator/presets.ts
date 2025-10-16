import { OrchestratorTask } from './types';

export interface MissionPreset {
  id: string;
  name: string;
  description: string;
  buildTask: () => OrchestratorTask;
}

const createTaskId = (prefix: string): string => `${prefix}-${Date.now()}`;

export const createDefaultMissionPresets = (): MissionPreset[] => [
  {
    id: 'launch-readiness',
    name: 'Full Launch Readiness',
    description:
      'Runs the end-to-end launch sequence across orchestration, build, intelligence, and operations.',
    buildTask: () => ({
      id: createTaskId('launch-readiness'),
      name: 'Full Launch Readiness',
      createdAt: new Date().toISOString(),
      priority: 'critical',
      requestedBy: 'launch-director',
      metadata: {
        release: 'v24.0.0',
        changeWindow: '2025-01-07T09:00:00Z',
      },
      actions: [
        {
          moduleId: 'maestro-composer',
          action: 'compose-blueprint',
          payload: { pipeline: 'enterprise-launch' },
        },
        {
          moduleId: 'maestro-composer',
          action: 'schedule-symphony',
          payload: { window: 'tonight-22:00Z' },
        },
        { moduleId: 'build-plane', action: 'prepare-artifacts' },
        {
          moduleId: 'build-plane',
          action: 'validate-supply-chain',
          payload: { policyPack: 'gold' },
        },
        {
          moduleId: 'build-platform',
          action: 'plan-release',
          payload: { release: 'v24.0.0' },
        },
        {
          moduleId: 'build-platform',
          action: 'enforce-guardrails',
        },
        {
          moduleId: 'company-os',
          action: 'synchronize-policies',
          payload: { domains: ['security', 'compliance', 'privacy'] },
        },
        {
          moduleId: 'switchboard',
          action: 'route-signal',
          payload: { signal: 'launch-go' },
        },
        {
          moduleId: 'intelgraph',
          action: 'analyze-graph',
          payload: { nodes: 2450 },
        },
        {
          moduleId: 'activities',
          action: 'generate-report',
          payload: { scope: 'launch-readiness' },
        },
      ],
    }),
  },
  {
    id: 'stability-check',
    name: 'Stability & Guardrail Check',
    description:
      'Validates guardrails, syncs policies, and updates operations status.',
    buildTask: () => ({
      id: createTaskId('stability-check'),
      name: 'Stability Guardrail Review',
      createdAt: new Date().toISOString(),
      priority: 'high',
      requestedBy: 'sre-lead',
      actions: [
        { moduleId: 'build-platform', action: 'enforce-guardrails' },
        {
          moduleId: 'company-os',
          action: 'broadcast-update',
          payload: { channel: 'engineering' },
        },
        { moduleId: 'switchboard', action: 'sync-webhooks' },
        {
          moduleId: 'activities',
          action: 'log-activity',
          payload: { activity: 'guardrail-check' },
        },
      ],
    }),
  },
  {
    id: 'insight-sync',
    name: 'Insight Synchronization',
    description:
      'Pulls new graph intelligence, enriches entities, and shares outcomes across the company.',
    buildTask: () => ({
      id: createTaskId('insight-sync'),
      name: 'Insight Synchronization',
      createdAt: new Date().toISOString(),
      priority: 'normal',
      requestedBy: 'intel-team',
      actions: [
        {
          moduleId: 'intelgraph',
          action: 'analyze-graph',
          payload: { nodes: 800 },
        },
        {
          moduleId: 'intelgraph',
          action: 'publish-findings',
          payload: {
            audience: 'executive',
            summary: 'Launch trajectory healthy',
          },
        },
        {
          moduleId: 'company-os',
          action: 'broadcast-update',
          payload: { channel: 'leadership' },
        },
        {
          moduleId: 'activities',
          action: 'generate-report',
          payload: { scope: 'intel-update' },
        },
      ],
    }),
  },
  {
    id: 'rapid-response',
    name: 'Rapid Response',
    description:
      'Routes incidents, elevates response, and coordinates maestro recovery.',
    buildTask: () => ({
      id: createTaskId('rapid-response'),
      name: 'Rapid Response Simulation',
      createdAt: new Date().toISOString(),
      priority: 'critical',
      requestedBy: 'incident-commander',
      actions: [
        {
          moduleId: 'switchboard',
          action: 'elevate-incident',
          payload: { severity: 'high' },
        },
        {
          moduleId: 'maestro-composer',
          action: 'publish-runbook',
          payload: { audience: 'incident-team' },
        },
        {
          moduleId: 'build-plane',
          action: 'promote-build',
          payload: { target: 'hotfix' },
        },
        {
          moduleId: 'activities',
          action: 'log-activity',
          payload: { activity: 'rapid-response' },
        },
      ],
    }),
  },
];
