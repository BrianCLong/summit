/**
 * Workflow Service
 * Manages workflows, automation rules, and custom fields
 */

import { EventEmitter } from 'events';
import type {
  Workflow,
  WorkflowTrigger,
  WorkflowTriggerType,
  WorkflowAction,
  WorkflowActionType,
  CustomField,
  CustomFieldType,
  CustomFieldGroup,
  FilterGroup,
  CustomFieldValue,
} from '../models/types';

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  conditions?: FilterGroup;
  actions: Omit<WorkflowAction, 'id'>[];
  ownerId: string;
}

export interface CustomFieldCreateInput {
  name: string;
  label: string;
  type: CustomFieldType;
  entityType: 'contact' | 'company' | 'deal' | 'activity' | 'task';
  required?: boolean;
  options?: { value: string; label: string; color?: string }[];
  defaultValue?: CustomFieldValue;
  helpText?: string;
  groupId?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredBy: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actions: ActionExecution[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ActionExecution {
  actionId: string;
  actionType: WorkflowActionType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  executedAt?: Date;
}

export class WorkflowService extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private customFields: Map<string, CustomField> = new Map();
  private fieldGroups: Map<string, CustomFieldGroup> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor() {
    super();
    this.initializeDefaultFields();
  }

  private initializeDefaultFields(): void {
    // Create default field groups
    const groups: CustomFieldGroup[] = [
      { id: 'grp_contact_basic', name: 'Basic Information', entityType: 'contact', order: 1, isCollapsed: false },
      { id: 'grp_contact_custom', name: 'Custom Fields', entityType: 'contact', order: 2, isCollapsed: false },
      { id: 'grp_company_basic', name: 'Company Details', entityType: 'company', order: 1, isCollapsed: false },
      { id: 'grp_deal_basic', name: 'Deal Information', entityType: 'deal', order: 1, isCollapsed: false },
    ];

    for (const group of groups) {
      this.fieldGroups.set(group.id, group);
    }
  }

  // Workflow Management

  /**
   * Create workflow
   */
  async createWorkflow(input: WorkflowCreateInput): Promise<Workflow> {
    const id = this.generateId('wf');
    const now = new Date();

    const actions: WorkflowAction[] = input.actions.map((a, index) => ({
      ...a,
      id: `action_${index}`,
      order: index,
    }));

    const workflow: Workflow = {
      id,
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      conditions: input.conditions || { operator: 'and', conditions: [] },
      actions,
      status: 'draft',
      runCount: 0,
      ownerId: input.ownerId,
      createdAt: now,
      updatedAt: now,
    };

    this.workflows.set(id, workflow);
    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  /**
   * Get all workflows
   */
  async getWorkflows(ownerId?: string, entityType?: string): Promise<Workflow[]> {
    let workflows = Array.from(this.workflows.values());

    if (ownerId) {
      workflows = workflows.filter((w) => w.ownerId === ownerId);
    }
    if (entityType) {
      workflows = workflows.filter((w) => w.trigger.entityType === entityType);
    }

    return workflows;
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    id: string,
    updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>
  ): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const updated = { ...workflow, ...updates, updatedAt: new Date() };
    this.workflows.set(id, updated);
    return updated;
  }

  /**
   * Activate workflow
   */
  async activateWorkflow(id: string): Promise<Workflow> {
    return this.updateWorkflow(id, { status: 'active' });
  }

  /**
   * Pause workflow
   */
  async pauseWorkflow(id: string): Promise<Workflow> {
    return this.updateWorkflow(id, { status: 'paused' });
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    this.workflows.delete(id);
  }

  /**
   * Trigger workflow
   */
  async triggerWorkflow(
    triggerType: WorkflowTriggerType,
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>,
    changes?: { field: string; oldValue: unknown; newValue: unknown }[]
  ): Promise<WorkflowExecution[]> {
    const executions: WorkflowExecution[] = [];

    // Find matching workflows
    const matchingWorkflows = Array.from(this.workflows.values()).filter(
      (w) =>
        w.status === 'active' &&
        w.trigger.type === triggerType &&
        w.trigger.entityType === entityType
    );

    for (const workflow of matchingWorkflows) {
      // Check trigger conditions
      if (!this.matchesTrigger(workflow.trigger, changes)) {
        continue;
      }

      // Check workflow conditions
      if (!this.evaluateConditions(workflow.conditions, entityData)) {
        continue;
      }

      // Execute workflow
      const execution = await this.executeWorkflow(workflow, entityType, entityId, entityData);
      executions.push(execution);
    }

    return executions;
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(
    workflow: Workflow,
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    const id = this.generateId('exec');
    const now = new Date();

    const execution: WorkflowExecution = {
      id,
      workflowId: workflow.id,
      triggeredBy: entityType,
      entityType,
      entityId,
      status: 'running',
      actions: workflow.actions.map((a) => ({
        actionId: a.id,
        actionType: a.type,
        status: 'pending',
      })),
      startedAt: now,
    };

    this.executions.set(id, execution);

    // Update workflow run count
    workflow.runCount++;
    workflow.lastRunAt = now;
    this.workflows.set(workflow.id, workflow);

    // Execute actions sequentially
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      const actionExec = execution.actions[i];

      try {
        // Handle delay if configured
        if (action.delay?.type === 'delay') {
          const delayMs =
            ((action.delay.delayDays || 0) * 24 * 60 + (action.delay.delayHours || 0) * 60 + (action.delay.delayMinutes || 0)) *
            60 *
            1000;
          await this.delay(delayMs);
        }

        actionExec.status = 'running';
        const result = await this.executeAction(action, entityType, entityId, entityData);
        actionExec.status = 'completed';
        actionExec.result = result;
        actionExec.executedAt = new Date();
      } catch (error) {
        actionExec.status = 'failed';
        actionExec.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    execution.status = execution.actions.some((a) => a.status === 'failed') ? 'failed' : 'completed';
    execution.completedAt = new Date();
    this.executions.set(id, execution);

    this.emit('workflow:executed', execution);

    return execution;
  }

  /**
   * Execute single action
   */
  private async executeAction(
    action: WorkflowAction,
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>
  ): Promise<unknown> {
    switch (action.type) {
      case 'update_field':
        return this.emit('action:updateField', {
          entityType,
          entityId,
          field: action.config.field,
          value: action.config.value,
        });

      case 'create_task':
        return this.emit('action:createTask', {
          entityType,
          entityId,
          taskType: action.config.taskType,
          title: action.config.taskTitle,
          dueDays: action.config.taskDueDays,
          assigneeId: action.config.userId,
        });

      case 'send_email':
        return this.emit('action:sendEmail', {
          entityType,
          entityId,
          templateId: action.config.templateId,
        });

      case 'send_notification':
        return this.emit('action:sendNotification', {
          entityType,
          entityId,
          userId: action.config.userId,
          message: action.config.message,
        });

      case 'assign_owner':
        return this.emit('action:assignOwner', {
          entityType,
          entityId,
          userId: action.config.userId,
        });

      case 'add_tag':
        return this.emit('action:addTag', {
          entityType,
          entityId,
          tags: action.config.tags,
        });

      case 'remove_tag':
        return this.emit('action:removeTag', {
          entityType,
          entityId,
          tags: action.config.tags,
        });

      case 'move_stage':
        return this.emit('action:moveStage', {
          entityType,
          entityId,
          stageId: action.config.stageId,
        });

      case 'enroll_sequence':
        return this.emit('action:enrollSequence', {
          entityType,
          entityId,
          sequenceId: action.config.sequenceId,
        });

      case 'update_score':
        return this.emit('action:updateScore', {
          entityType,
          entityId,
          scoreChange: action.config.scoreChange,
        });

      case 'webhook':
        return this.emit('action:webhook', {
          url: action.config.webhookUrl,
          entityType,
          entityId,
          data: entityData,
        });

      case 'slack_message':
        return this.emit('action:slackMessage', {
          channel: action.config.slackChannel,
          message: action.config.message,
          entityType,
          entityId,
        });

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private matchesTrigger(
    trigger: WorkflowTrigger,
    changes?: { field: string; oldValue: unknown; newValue: unknown }[]
  ): boolean {
    if (trigger.type === 'field_changed' && trigger.field) {
      if (!changes) return false;
      const change = changes.find((c) => c.field === trigger.field);
      if (!change) return false;
      if (trigger.fromValue !== undefined && change.oldValue !== trigger.fromValue) return false;
      if (trigger.toValue !== undefined && change.newValue !== trigger.toValue) return false;
    }
    return true;
  }

  private evaluateConditions(conditions: FilterGroup, data: Record<string, unknown>): boolean {
    if (conditions.conditions.length === 0 && (!conditions.groups || conditions.groups.length === 0)) {
      return true;
    }

    const results = conditions.conditions.map((condition) => {
      const value = data[condition.field];
      return this.evaluateCondition(value, condition.operator, condition.value);
    });

    if (conditions.groups) {
      for (const group of conditions.groups) {
        results.push(this.evaluateConditions(group, data));
      }
    }

    return conditions.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
  }

  private evaluateCondition(fieldValue: unknown, operator: string, conditionValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      default:
        return true;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.min(ms, 100))); // Cap for testing
  }

  // Custom Field Management

  /**
   * Create custom field
   */
  async createCustomField(input: CustomFieldCreateInput): Promise<CustomField> {
    const id = this.generateId('cf');
    const now = new Date();

    // Get order for this entity type
    const existingFields = Array.from(this.customFields.values()).filter(
      (f) => f.entityType === input.entityType
    );
    const order = existingFields.length + 1;

    const field: CustomField = {
      id,
      name: input.name,
      label: input.label,
      type: input.type,
      entityType: input.entityType,
      required: input.required || false,
      options: input.options?.map((o, i) => ({ ...o, order: i })),
      defaultValue: input.defaultValue,
      helpText: input.helpText,
      order,
      groupId: input.groupId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.customFields.set(id, field);
    return field;
  }

  /**
   * Get custom field by ID
   */
  async getCustomField(id: string): Promise<CustomField | null> {
    return this.customFields.get(id) || null;
  }

  /**
   * Get custom fields for entity type
   */
  async getCustomFields(entityType: string): Promise<CustomField[]> {
    return Array.from(this.customFields.values())
      .filter((f) => f.entityType === entityType && f.isActive)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Update custom field
   */
  async updateCustomField(
    id: string,
    updates: Partial<Omit<CustomField, 'id' | 'createdAt'>>
  ): Promise<CustomField> {
    const field = this.customFields.get(id);
    if (!field) {
      throw new Error(`Custom field ${id} not found`);
    }

    const updated = { ...field, ...updates, updatedAt: new Date() };
    this.customFields.set(id, updated);
    return updated;
  }

  /**
   * Delete custom field
   */
  async deleteCustomField(id: string): Promise<void> {
    const field = this.customFields.get(id);
    if (field) {
      field.isActive = false;
      this.customFields.set(id, field);
    }
  }

  /**
   * Reorder custom fields
   */
  async reorderCustomFields(entityType: string, fieldIds: string[]): Promise<CustomField[]> {
    const fields: CustomField[] = [];

    for (let i = 0; i < fieldIds.length; i++) {
      const field = this.customFields.get(fieldIds[i]);
      if (field && field.entityType === entityType) {
        field.order = i + 1;
        field.updatedAt = new Date();
        this.customFields.set(field.id, field);
        fields.push(field);
      }
    }

    return fields;
  }

  // Field Group Management

  /**
   * Create field group
   */
  async createFieldGroup(
    name: string,
    entityType: 'contact' | 'company' | 'deal' | 'activity' | 'task'
  ): Promise<CustomFieldGroup> {
    const id = this.generateId('grp');
    const existingGroups = Array.from(this.fieldGroups.values()).filter(
      (g) => g.entityType === entityType
    );

    const group: CustomFieldGroup = {
      id,
      name,
      entityType,
      order: existingGroups.length + 1,
      isCollapsed: false,
    };

    this.fieldGroups.set(id, group);
    return group;
  }

  /**
   * Get field groups for entity type
   */
  async getFieldGroups(entityType: string): Promise<CustomFieldGroup[]> {
    return Array.from(this.fieldGroups.values())
      .filter((g) => g.entityType === entityType)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(
    workflowId?: string,
    limit = 50
  ): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values());

    if (workflowId) {
      executions = executions.filter((e) => e.workflowId === workflowId);
    }

    return executions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const workflowService = new WorkflowService();
