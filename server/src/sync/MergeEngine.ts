
import { VectorClock, VectorClockUtils } from './VectorClock.js';

export type MergeResult =
  | { status: 'applied'; payload: any; vectorClock: VectorClock; isTombstone: boolean }
  | { status: 'ignored'; reason: string }
  | { status: 'conflict'; payload: any; vectorClock: VectorClock; isTombstone: boolean; conflictReason: string };

export class MergeEngine {
  static merge(
    existingState: { payload: any; vectorClock: VectorClock; isTombstone: boolean } | null,
    incomingOp: { payload: any; vectorClock: VectorClock; isTombstone: boolean }
  ): MergeResult {
    if (!existingState) {
      return {
        status: 'applied',
        payload: incomingOp.payload,
        vectorClock: incomingOp.vectorClock,
        isTombstone: incomingOp.isTombstone
      };
    }

    const comparison = VectorClockUtils.compare(existingState.vectorClock, incomingOp.vectorClock);

    if (comparison === 'before') {
      // Existing is before incoming -> Incoming dominates
      return {
        status: 'applied',
        payload: incomingOp.payload,
        vectorClock: incomingOp.vectorClock,
        isTombstone: incomingOp.isTombstone
      };
    }

    if (comparison === 'after') {
      // Existing is after incoming -> Incoming is stale
      return { status: 'ignored', reason: 'stale_update' };
    }

    if (comparison === 'equal') {
        return { status: 'ignored', reason: 'duplicate' };
    }

    // Concurrent

    let winner = existingState;
    let loser = incomingOp;
    let reason = 'CONCURRENT_UPDATE';

    if (existingState.isTombstone && !incomingOp.isTombstone) {
      winner = existingState;
      loser = incomingOp;
      reason = 'DELETE_VS_UPDATE';
    } else if (!existingState.isTombstone && incomingOp.isTombstone) {
      winner = incomingOp;
      loser = existingState;
      reason = 'DELETE_VS_UPDATE';
    } else {
        const s1 = JSON.stringify(existingState.payload);
        const s2 = JSON.stringify(incomingOp.payload);

        if (s2 > s1) {
            winner = incomingOp;
            loser = existingState;
        } else {
            winner = existingState;
            loser = incomingOp;
        }
    }

    if (winner === incomingOp) {
       return {
           status: 'conflict',
           payload: incomingOp.payload,
           vectorClock: VectorClockUtils.merge(existingState.vectorClock, incomingOp.vectorClock),
           isTombstone: incomingOp.isTombstone,
           conflictReason: reason
       };
    } else {
        return {
           status: 'conflict',
           payload: existingState.payload,
           vectorClock: VectorClockUtils.merge(existingState.vectorClock, incomingOp.vectorClock),
           isTombstone: existingState.isTombstone,
           conflictReason: reason
        };
    }
  }
}
