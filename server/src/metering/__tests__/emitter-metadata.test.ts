// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../pipeline', () => ({
  meteringPipeline: {
    enqueue: jest.fn().mockResolvedValue(undefined),
  },
}));

import { meteringEmitter } from '../emitter';
import { MeterEventKind } from '../schema';
import { hasRequiredMeteringMetadata } from '../metadata';
import { meteringPipeline } from '../pipeline';

const enqueueMock = meteringPipeline.enqueue as jest.Mock;

describe('Metering metadata requirements', () => {
  beforeEach(() => {
    enqueueMock.mockClear();
  });

  it('emits run_started with required metadata', async () => {
    await meteringEmitter.emitRunStarted({
      tenantId: 'tenant-1',
      runId: 'run-1',
      pipelineName: 'pipeline-a',
      source: 'test',
      actorType: 'user',
      workflowType: 'pipeline-a',
    });

    const event = enqueueMock.mock.calls[0][0];
    expect(event.kind).toBe(MeterEventKind.RUN_STARTED);
    expect(hasRequiredMeteringMetadata(event.metadata)).toBe(true);
  });

  it('emits step_executed with required metadata', async () => {
    await meteringEmitter.emitStepExecuted({
      tenantId: 'tenant-1',
      runId: 'run-1',
      stepId: 'step-1',
      status: 'success',
      tool: 'utils.echo',
      source: 'test',
      actorType: 'system',
      workflowType: 'workflow-a',
    });

    const event = enqueueMock.mock.calls[0][0];
    expect(event.kind).toBe(MeterEventKind.STEP_EXECUTED);
    expect(hasRequiredMeteringMetadata(event.metadata)).toBe(true);
  });

  it('emits approval_decision with required metadata', async () => {
    await meteringEmitter.emitApprovalDecision({
      tenantId: 'tenant-1',
      runId: 'run-1',
      stepId: 'step-1',
      decision: 'approved',
      userId: 'user-1',
      source: 'test',
      actorType: 'user',
      workflowType: 'maestro_run',
    });

    const event = enqueueMock.mock.calls[0][0];
    expect(event.kind).toBe(MeterEventKind.APPROVAL_DECISION);
    expect(hasRequiredMeteringMetadata(event.metadata)).toBe(true);
  });

  it('emits receipt_emitted with required metadata', async () => {
    await meteringEmitter.emitReceiptEmitted({
      tenantId: 'tenant-1',
      runId: 'run-1',
      receiptId: 'receipt-1',
      artifactId: 'artifact-1',
      source: 'test',
      actorType: 'user',
      workflowType: 'maestro_run',
    });

    const event = enqueueMock.mock.calls[0][0];
    expect(event.kind).toBe(MeterEventKind.RECEIPT_EMITTED);
    expect(hasRequiredMeteringMetadata(event.metadata)).toBe(true);
  });

  it('emits evidence_exported with required metadata', async () => {
    await meteringEmitter.emitEvidenceExported({
      tenantId: 'tenant-1',
      runId: 'run-1',
      evidenceCount: 2,
      source: 'test',
      actorType: 'system',
      workflowType: 'maestro_run',
    });

    const event = enqueueMock.mock.calls[0][0];
    expect(event.kind).toBe(MeterEventKind.EVIDENCE_EXPORTED);
    expect(hasRequiredMeteringMetadata(event.metadata)).toBe(true);
  });

  it('emits storage_bytes_written with required metadata', async () => {
    await meteringEmitter.emitStorageBytesWritten({
      tenantId: 'tenant-1',
      bytes: 1024,
      storagePath: 'inline://artifact',
      source: 'test',
      actorType: 'system',
      workflowType: 'file_upload',
    });

    const event = enqueueMock.mock.calls[0][0];
    expect(event.kind).toBe(MeterEventKind.STORAGE_BYTES_WRITTEN);
    expect(hasRequiredMeteringMetadata(event.metadata)).toBe(true);
  });
});
