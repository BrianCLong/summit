import type { CogBattleStorage } from '../storage';
import { applyCogWriteSet } from './firewall';
import type { CogRejectionReport, CogWriteSet } from './types';

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown runtime error';
}

export async function writeArtifacts(
  store: CogBattleStorage,
  writeset: CogWriteSet,
): Promise<CogRejectionReport> {
  try {
    return await applyCogWriteSet(store, writeset);
  } catch (error: unknown) {
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
              message: stringifyError(error),
            },
          ],
        },
      ],
    };
  }
}
