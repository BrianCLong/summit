import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BgprDashboard from '../BgprDashboard';
import type {
  DryRunResult,
  RolloutManifest,
  RolloutResult,
  StatusResponse,
} from '../api';
import {
  createSampleManifest,
  fetchStatus,
  submitDryRun,
  submitRollout,
} from '../api';

jest.mock('../api');

const sampleManifest: RolloutManifest = {
  id: 'rollout-demo',
  policyVersion: 'policy-v2',
  canaryPopulation: ['tenant-a', 'tenant-b'],
  controlPopulation: ['tenant-c', 'tenant-d'],
  thresholds: {
    minBlockRate: 0.72,
    maxLatencyMs: 110,
    maxFnDelta: 4,
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  signature: 'signed-manifest',
};

const baseStatus: StatusResponse = {
  currentPolicy: 'policy-v1',
  lastResult: null,
  auditTrail: [],
};

beforeEach(() => {
  jest.resetAllMocks();
  (createSampleManifest as jest.Mock).mockReturnValue(sampleManifest);
});

test('renders current policy and empty audit trail', async () => {
  (fetchStatus as jest.Mock).mockResolvedValue(baseStatus);

  render(<BgprDashboard />);

  await waitFor(() => expect(fetchStatus).toHaveBeenCalled());
  expect(screen.getByText('policy-v1')).toBeInTheDocument();
  expect(screen.getByText('No audit activity recorded yet.')).toBeInTheDocument();
});

test('displays dry-run metrics after execution', async () => {
  const dryRun: DryRunResult = {
    manifest: sampleManifest,
    metrics: {
      canary: { blockRate: 0.81, fnCanaryCatches: 3, latencyMs: 75 },
      control: { blockRate: 0.79, fnCanaryCatches: 4, latencyMs: 80 },
    },
  };
  (fetchStatus as jest.Mock)
    .mockResolvedValueOnce(baseStatus)
    .mockResolvedValueOnce(baseStatus);
  (submitDryRun as jest.Mock).mockResolvedValue(dryRun);

  render(<BgprDashboard />);

  await waitFor(() => expect(fetchStatus).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Dry Run' }));

  await waitFor(() => expect(submitDryRun).toHaveBeenCalledTimes(1));
  expect(screen.getByText('0.81')).toBeInTheDocument();
  expect(screen.getByText('0.79')).toBeInTheDocument();
});

test('shows auto-revert outcome after rollout breach', async () => {
  const revertedResult: RolloutResult = {
    manifest: sampleManifest,
    metrics: {
      canary: { blockRate: 0.6, fnCanaryCatches: 8, latencyMs: 120 },
      control: { blockRate: 0.9, fnCanaryCatches: 2, latencyMs: 60 },
    },
    breaches: ['block rate below minimum'],
    reverted: true,
    auditEvent: {
      manifestId: sampleManifest.id,
      policyVersion: sampleManifest.policyVersion,
      outcome: 'reverted',
      reason: 'auto-reverted due to breaches',
      timestamp: '2025-01-02T00:00:00.000Z',
    },
  };
  const statusAfterRollout: StatusResponse = {
    currentPolicy: 'policy-v1',
    lastResult: revertedResult,
    auditTrail: [revertedResult.auditEvent],
  };

  (fetchStatus as jest.Mock)
    .mockResolvedValueOnce(baseStatus)
    .mockResolvedValueOnce(baseStatus)
    .mockResolvedValueOnce(statusAfterRollout);
  (submitRollout as jest.Mock).mockResolvedValue(revertedResult);

  render(<BgprDashboard />);

  await waitFor(() => expect(fetchStatus).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Apply Rollout' }));

  await waitFor(() => expect(submitRollout).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(fetchStatus).toHaveBeenCalledTimes(3));
  expect(screen.getByText('Auto-reverted')).toBeInTheDocument();
  expect(screen.getByText('auto-reverted due to breaches')).toBeInTheDocument();
});

