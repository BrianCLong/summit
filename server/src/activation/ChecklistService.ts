import { CanonicalEvent } from './events.js';

export type ChecklistItemKey =
  | 'workspace_created'
  | 'role_assigned'
  | 'starter_data'
  | 'entity_linked'
  | 'insight_saved'
  | 'notifications_configured';

export type ChecklistItem = {
  key: ChecklistItemKey;
  label: string;
  completed: boolean;
  completedAt?: Date;
};

export type ChecklistState = {
  workspaceId: string;
  items: ChecklistItem[];
};

const BASE_ITEMS: ChecklistItem[] = [
  { key: 'workspace_created', label: 'Workspace created', completed: false },
  { key: 'role_assigned', label: 'Role assigned', completed: false },
  { key: 'starter_data', label: 'Starter data provisioned', completed: false },
  { key: 'entity_linked', label: 'Entity linked', completed: false },
  { key: 'insight_saved', label: 'Insight saved', completed: false },
  { key: 'notifications_configured', label: 'Notifications configured', completed: false },
];

export class ChecklistService {
  private checklists = new Map<string, ChecklistState>();

  initializeChecklist(workspaceId: string): ChecklistState {
    if (!this.checklists.has(workspaceId)) {
      this.checklists.set(workspaceId, {
        workspaceId,
        items: BASE_ITEMS.map((item) => ({ ...item })),
      });
    }
    return this.checklists.get(workspaceId)!;
  }

  handleEvent(event: CanonicalEvent): ChecklistState {
    const checklist = this.initializeChecklist(event.workspaceId);
    const itemKey = this.mapEventToItem(event);
    if (itemKey) {
      const item = checklist.items.find((i) => i.key === itemKey);
      if (item && !item.completed) {
        item.completed = true;
        item.completedAt = new Date(event.timestamp);
      }
    }
    return checklist;
  }

  getChecklist(workspaceId: string): ChecklistState {
    return this.initializeChecklist(workspaceId);
  }

  private mapEventToItem(event: CanonicalEvent): ChecklistItemKey | undefined {
    switch (event.type) {
      case 'workspace_created':
        return 'workspace_created';
      case 'role_assigned':
        return 'role_assigned';
      case 'starter_data_provisioned':
        return 'starter_data';
      case 'entity_linked':
        return 'entity_linked';
      case 'insight_saved':
        return 'insight_saved';
      case 'notification_sent':
        return 'notifications_configured';
      default:
        return undefined;
    }
  }
}
