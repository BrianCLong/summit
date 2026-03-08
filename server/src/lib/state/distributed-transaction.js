"use strict";
// server/src/lib/state/distributed-transaction.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaCoordinator = exports.TwoPhaseCommitCoordinator = exports.lockManager = void 0;
// --- Distributed Lock Manager ---
/**
 * A simple in-memory distributed lock manager.
 * NOTE: This is a simplified simulation for demonstration purposes and is not a production-ready implementation.
 * In a real system, this would be backed by a distributed key-value store like Redis or ZooKeeper.
 */
class DistributedLockManager {
    locks = new Set();
    acquire(lockId) {
        if (this.locks.has(lockId)) {
            return false; // Lock already held
        }
        this.locks.add(lockId);
        return true;
    }
    release(lockId) {
        this.locks.delete(lockId);
    }
}
exports.lockManager = new DistributedLockManager();
class TwoPhaseCommitCoordinator {
    participants = [];
    addParticipant(participant) {
        this.participants.push(participant);
    }
    execute() {
        // Phase 1: Prepare
        const allCanCommit = this.participants.every(p => p.canCommit());
        if (allCanCommit) {
            // Phase 2: Commit
            this.participants.forEach(p => p.commit());
            return true;
        }
        else {
            // Phase 2: Rollback
            this.participants.forEach(p => p.rollback());
            return false;
        }
    }
}
exports.TwoPhaseCommitCoordinator = TwoPhaseCommitCoordinator;
class SagaCoordinator {
    actions = [];
    executedActions = [];
    addAction(action) {
        this.actions.push(action);
    }
    async execute() {
        for (const action of this.actions) {
            try {
                await action.execute();
                this.executedActions.push(action);
            }
            catch (error) {
                console.error('Saga action failed, starting compensation...', error);
                await this.compensate();
                return false;
            }
        }
        return true;
    }
    async compensate() {
        for (const action of this.executedActions.reverse()) {
            try {
                await action.compensate();
            }
            catch (error) {
                console.error('Saga compensation action failed:', error);
                // In a real system, this would require manual intervention.
            }
        }
    }
}
exports.SagaCoordinator = SagaCoordinator;
