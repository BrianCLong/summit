import type { CogBattleStorage } from '../storage';
import { applyCogWriteSet } from './firewall';
import type { CogRejectionReport, CogWriteSet } from './types';

export async function writeArtifacts(
  store: CogBattleStorage,
  writeset: CogWriteSet,
): Promise<CogRejectionReport> {
  try {
    return await applyCogWriteSet(store, writeset);
  } catch (error: any) {
    return {
      ok: false,
      writesetId: writeset.writesetId,
      summary: {
        receivedOps: writeset.ops.length,
        acceptedOps: 0,
        rejectedOps: writeset.ops.length,
      },
      items: [
        {
          opId: 'RUNTIME',
          status: 'REJECTED',
          errors: [
            {
              code: 'RUNTIME_ERROR',
              message: error?.message ?? 'unknown runtime error',
            },
          ],
        },
      ],
    };
  }
}
