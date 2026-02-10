import {
  MigrationCheckpoint,
  MigrationManifest,
  MigrationProgress,
  MigrationStage,
  newIdentifier,
} from './types';

export class MigrationFactory {
  private progress = new Map<string, MigrationProgress>();

  start(manifest: MigrationManifest, total?: number) {
    const checkpoint: MigrationCheckpoint = { processed: 0, failed: 0, total };
    const initialStage: MigrationStage = manifest.enableDualRun ? 'dual_run' : 'backfill';
    const progress: MigrationProgress = {
      manifestId: manifest.id,
      stage: initialStage,
      checkpoint,
      errors: [],
      dlq: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    this.progress.set(manifest.id, progress);
    return progress;
  }

  advance(manifest: MigrationManifest, processedBatch: { id: string; success: boolean; error?: string }[]) {
    const progress = this.progress.get(manifest.id);
    if (!progress) throw new Error(`Migration ${manifest.id} not started`);

    processedBatch.forEach((item) => {
      if (item.success) {
        progress.checkpoint.processed += 1;
        progress.checkpoint.lastProcessedId = item.id;
      } else {
        progress.checkpoint.failed += 1;
        if (progress.errors.length < 50) {
          progress.errors.push(item.error || 'Unknown migration error');
        }
        progress.dlq.push({ id: item.id, error: item.error || 'Unknown error' });
      }
    });

    progress.updatedAt = new Date();
    const total = progress.checkpoint.total ?? processedBatch.length;
    const processed = progress.checkpoint.processed + progress.checkpoint.failed;
    const atCapacity = processedBatch.length > manifest.batchSize * 2;
    const overloaded = atCapacity && manifest.enableDualRun;

    if (overloaded) {
      progress.errors.push('Load shedding activated due to oversized batch');
    }

    if (processed >= total) {
      progress.stage = this.nextStage(progress.stage);
      progress.updatedAt = new Date();
      if (progress.stage === 'completed') {
        progress.completedAt = new Date();
      }
    }

    return progress;
  }

  nextStage(current: MigrationStage): MigrationStage {
    switch (current) {
      case 'dual_run':
        return 'backfill';
      case 'backfill':
        return 'verify';
      case 'verify':
        return 'cutover';
      case 'cutover':
        return 'delete';
      case 'delete':
        return 'completed';
      default:
        return 'failed';
    }
  }

  verify(manifestId: string, verificationPassed: boolean) {
    const progress = this.progress.get(manifestId);
    if (!progress) throw new Error(`Migration ${manifestId} not started`);
    if (!verificationPassed) {
      progress.errors.push('Verification failed, keeping on dual-run');
      progress.stage = 'failed';
      progress.completedAt = new Date();
    }
    return progress;
  }

  progressReport(manifestId: string) {
    const progress = this.progress.get(manifestId);
    if (!progress) throw new Error(`Migration ${manifestId} not started`);
    const total = progress.checkpoint.total ?? progress.checkpoint.processed + progress.checkpoint.failed;
    const percent = total === 0 ? 0 : (progress.checkpoint.processed / total) * 100;
    return {
      ...progress,
      percentComplete: Number(percent.toFixed(2)),
      lag: Math.max(0, total - progress.checkpoint.processed - progress.checkpoint.failed),
    };
  }
}

export const buildManifest = (
  domain: MigrationManifest['domain'],
  scope: string,
  enableDualRun = true,
  batchSize = 100,
  maxRetries = 3,
): MigrationManifest => ({
  id: newIdentifier(),
  domain,
  scope,
  successCriteria: ['row counts match', 'hash parity holds', 'invariants clean'],
  decommissionPlan: 'Drop legacy objects after cutover verification',
  batchSize,
  maxRetries,
  enableDualRun,
});
