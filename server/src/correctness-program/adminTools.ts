import { RepairAction, newIdentifier } from './types';

export class AdminRepairService {
  private actions: RepairAction[] = [];

  queueAction(action: Omit<RepairAction, 'id' | 'approvalRequired'>) {
    const approvalRequired = action.risk === 'high' || action.risk === 'medium';
    const entry: RepairAction = { ...action, id: newIdentifier(), approvalRequired };
    this.actions.push(entry);
    return entry;
  }

  approve(actionId: string, approver: string) {
    const action = this.actions.find((a) => a.id === actionId);
    if (!action) throw new Error('Action not found');
    action.approvedBy = approver;
    return action;
  }

  execute(actionId: string, executor: string) {
    const action = this.actions.find((a) => a.id === actionId);
    if (!action) throw new Error('Action not found');
    if (action.approvalRequired && !action.approvedBy) throw new Error('Approval required');
    action.executedBy = executor;
    action.executedAt = new Date();
    return action;
  }

  list() {
    return [...this.actions];
  }
}
