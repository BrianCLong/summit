
// server/src/lib/state/distributed-transaction.ts

// --- Distributed Lock Manager ---

/**
 * A simple in-memory distributed lock manager.
 * NOTE: This is a simplified simulation for demonstration purposes and is not a production-ready implementation.
 * In a real system, this would be backed by a distributed key-value store like Redis or ZooKeeper.
 */
class DistributedLockManager {
  private locks: Set<string> = new Set();

  public acquire(lockId: string): boolean {
    if (this.locks.has(lockId)) {
      return false; // Lock already held
    }
    this.locks.add(lockId);
    return true;
  }

  public release(lockId: string): void {
    this.locks.delete(lockId);
  }
}

export const lockManager = new DistributedLockManager();

// --- Two-Phase Commit (2PC) ---

export interface TransactionParticipant {
  canCommit(): boolean;
  commit(): void;
  rollback(): void;
}

export class TwoPhaseCommitCoordinator {
  private participants: TransactionParticipant[] = [];

  public addParticipant(participant: TransactionParticipant): void {
    this.participants.push(participant);
  }

  public execute(): boolean {
    // Phase 1: Prepare
    const allCanCommit = this.participants.every(p => p.canCommit());

    if (allCanCommit) {
      // Phase 2: Commit
      this.participants.forEach(p => p.commit());
      return true;
    } else {
      // Phase 2: Rollback
      this.participants.forEach(p => p.rollback());
      return false;
    }
  }
}

// --- Saga Pattern ---

export interface SagaAction {
  execute(): Promise<void>;
  compensate(): Promise<void>;
}

export class SagaCoordinator {
  private actions: SagaAction[] = [];
  private executedActions: SagaAction[] = [];

  public addAction(action: SagaAction): void {
    this.actions.push(action);
  }

  public async execute(): Promise<boolean> {
    for (const action of this.actions) {
      try {
        await action.execute();
        this.executedActions.push(action);
      } catch (error) {
        console.error('Saga action failed, starting compensation...', error);
        await this.compensate();
        return false;
      }
    }
    return true;
  }

  private async compensate(): Promise<void> {
    for (const action of this.executedActions.reverse()) {
      try {
        await action.compensate();
      } catch (error) {
        console.error('Saga compensation action failed:', error);
        // In a real system, this would require manual intervention.
      }
    }
  }
}
