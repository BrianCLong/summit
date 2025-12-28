import { WriteAction, ApprovalRequest, WriteActionStatus } from './types';
import { WriteValidator } from './validator';
import { WriteQuotaManager } from './quota';
import { provenanceLedger } from '../../provenance/ledger';
import { PersistenceStore, WriteExecutor } from './interfaces';
import { FilePersistenceStore } from './persistence/file-store';
import { FileSystemExecutor } from './executor/fs-executor';

export class ControlledWriteService {
  private persistence: PersistenceStore;
  private executor: WriteExecutor;

  constructor(persistence?: PersistenceStore, executor?: WriteExecutor) {
      this.persistence = persistence || new FilePersistenceStore();
      this.executor = executor || new FileSystemExecutor();
  }

  public async requestApproval(action: WriteAction): Promise<ApprovalRequest> {
    // 1. Validate the action
    WriteValidator.validateAction(action.type, action.payload);

    // 1b. Check budget before even requesting approval
    WriteQuotaManager.checkBudget(action);

    // 1c. Plan execution (Dry Run)
    const plan = await this.executor.plan(action);
    // Bind plan hash to action metadata for integrity
    if (!action.payload.metadata) action.payload.metadata = {};
    action.payload.metadata.planHash = plan.hash;

    // 2. Store the action
    action.status = 'PENDING_APPROVAL';
    action.createdAt = new Date();
    await this.persistence.saveAction(action);

    // 3. Create approval request
    const approval: ApprovalRequest = {
      actionId: action.id,
      approver: action.approver || 'HUMAN_ADMIN', // Default to generic admin if not specified
      scope: `Approve ${action.type} on ${action.payload.target} (Hash: ${plan.hash.substring(0, 8)})`,
      expiration: new Date(Date.now() + 1000 * 60 * 60), // 1 hour expiration
      status: 'PENDING',
      requestedAt: new Date(),
    };
    await this.persistence.saveApproval(approval);

    // 4. Audit
    await this.auditLog(action, 'WRITE_REQUESTED');

    return approval;
  }

  public async approveAction(actionId: string, approver: string): Promise<WriteAction> {
    const lock = await this.persistence.acquireLock(actionId);
    if (!lock) throw new Error('Could not acquire lock for action');

    try {
        const action = await this.persistence.getAction(actionId);
        const approval = await this.persistence.getApproval(actionId);

        if (!action || !approval) {
          throw new Error('Action or approval request not found.');
        }

        if (approval.status !== 'PENDING') {
          throw new Error(`Approval request is not pending (Status: ${approval.status})`);
        }

        if (new Date() > approval.expiration) {
          approval.status = 'EXPIRED';
          await this.persistence.saveApproval(approval); // persist expiry
          throw new Error('Approval request has expired.');
        }

        // Check approver match (simple string match for now)
        if (approval.approver !== approver) {
          throw new Error(`Invalid approver. Expected ${approval.approver}, got ${approver}`);
        }

        // Re-verify plan hash to ensure nothing changed?
        // For MVP, we trust the persisted action matches what was requested.

        approval.status = 'APPROVED';
        approval.respondedAt = new Date();
        await this.persistence.saveApproval(approval);

        action.status = 'APPROVED';
        action.updatedAt = new Date();
        await this.persistence.saveAction(action);

        // Audit
        await this.auditLog(action, 'WRITE_APPROVED');

        return action;
    } finally {
        await this.persistence.releaseLock(actionId);
    }
  }

  public async executeAction(actionId: string): Promise<void> {
      const lock = await this.persistence.acquireLock(actionId);
      if (!lock) throw new Error('Could not acquire lock for execution');

      try {
          const action = await this.persistence.getAction(actionId);
          if (!action) throw new Error('Action not found');

          // Late binding checks
          if (action.status !== 'APPROVED') {
              throw new Error(`Cannot execute action in status: ${action.status}`);
          }
          if (action.killSwitchActive) {
              throw new Error('Kill switch is active');
          }

          action.status = 'EXECUTING';
          await this.persistence.saveAction(action);

          try {
              await this.executor.execute(action);

              action.status = 'COMPLETED';
              await this.persistence.saveAction(action);
              await this.auditLog(action, 'WRITE_COMPLETED');
          } catch (e) {
              action.status = 'FAILED';
              await this.persistence.saveAction(action);
              await this.auditLog(action, 'WRITE_FAILED');
              throw e;
          }

      } finally {
          await this.persistence.releaseLock(actionId);
      }
  }

  public async rejectAction(actionId: string, approver: string): Promise<WriteAction> {
    const action = await this.persistence.getAction(actionId);
    const approval = await this.persistence.getApproval(actionId);

    if (!action || !approval) {
      throw new Error('Action or approval request not found.');
    }

    if (approval.status !== 'PENDING') {
       throw new Error(`Approval request is not pending (Status: ${approval.status})`);
    }

    // Check approver (rejection also needs valid authority)
    if (approval.approver !== approver) {
        throw new Error(`Invalid approver. Expected ${approval.approver}, got ${approver}`);
    }

    approval.status = 'REJECTED';
    approval.respondedAt = new Date();
    await this.persistence.saveApproval(approval);

    action.status = 'REJECTED';
    action.updatedAt = new Date();
    await this.persistence.saveAction(action);

    // Audit
    await this.auditLog(action, 'WRITE_REJECTED');

    return action;
  }

  public async getAction(id: string): Promise<WriteAction | undefined> {
      const action = await this.persistence.getAction(id);
      return action || undefined;
  }

  public async getApproval(actionId: string): Promise<ApprovalRequest | undefined> {
      const approval = await this.persistence.getApproval(actionId);
      return approval || undefined;
  }

  public async killAction(actionId: string): Promise<WriteAction> {
    const action = await this.persistence.getAction(actionId);
    if (!action) {
      throw new Error('Action not found.');
    }

    action.status = 'KILLED';
    action.killSwitchActive = true;
    action.updatedAt = new Date();
    await this.persistence.saveAction(action);

    await this.auditLog(action, 'WRITE_KILLED');

    return action;
  }

  public async rollbackAction(actionId: string): Promise<WriteAction> {
    const lock = await this.persistence.acquireLock(actionId);
    if (!lock) throw new Error('Could not acquire lock for rollback');

    try {
        const action = await this.persistence.getAction(actionId);
        if (!action) {
            throw new Error('Action not found.');
        }

        await this.executor.rollback(action);

        action.status = 'ROLLED_BACK';
        action.updatedAt = new Date();
        await this.persistence.saveAction(action);

        await this.auditLog(action, 'WRITE_ROLLED_BACK');

        return action;
    } finally {
        await this.persistence.releaseLock(actionId);
    }
  }

  private async auditLog(action: WriteAction, event: string) {
    try {
      await provenanceLedger.appendEntry({
        tenantId: 'system', // or action.tenantId if available
        actionType: event,
        resourceType: 'WriteAction',
        resourceId: action.id,
        actorId: action.requester,
        actorType: 'system',
        timestamp: new Date(),
        payload: {
           // Mapping to MutationPayload structure
           mutationType: 'UPDATE', // Treating all status changes as updates
           entityId: action.id,
           entityType: 'WriteAction',
           // Custom fields
           actionType: action.type,
           target: action.payload.target,
           status: action.status,
           budget: action.budget
        },
        metadata: {
          approver: action.approver,
          killSwitchActive: action.killSwitchActive
        }
      });
    } catch (error) {
       console.error(`Failed to audit log ${event}:`, error);
       // We don't block the action if audit fails in this MVP, but in prod we might
    }
  }
}
