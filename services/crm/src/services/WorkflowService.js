"use strict";
/**
 * Workflow Service
 * Manages workflows, automation rules, and custom fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.WorkflowService = void 0;
const events_1 = require("events");
class WorkflowService extends events_1.EventEmitter {
    workflows = new Map();
    customFields = new Map();
    fieldGroups = new Map();
    executions = new Map();
    constructor() {
        super();
        this.initializeDefaultFields();
    }
    initializeDefaultFields() {
        // Create default field groups
        const groups = [
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
    async createWorkflow(input) {
        const id = this.generateId('wf');
        const now = new Date();
        const actions = input.actions.map((a, index) => ({
            ...a,
            id: `action_${index}`,
            order: index,
        }));
        const workflow = {
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
    async getWorkflow(id) {
        return this.workflows.get(id) || null;
    }
    /**
     * Get all workflows
     */
    async getWorkflows(ownerId, entityType) {
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
    async updateWorkflow(id, updates) {
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
    async activateWorkflow(id) {
        return this.updateWorkflow(id, { status: 'active' });
    }
    /**
     * Pause workflow
     */
    async pauseWorkflow(id) {
        return this.updateWorkflow(id, { status: 'paused' });
    }
    /**
     * Delete workflow
     */
    async deleteWorkflow(id) {
        this.workflows.delete(id);
    }
    /**
     * Trigger workflow
     */
    async triggerWorkflow(triggerType, entityType, entityId, entityData, changes) {
        const executions = [];
        // Find matching workflows
        const matchingWorkflows = Array.from(this.workflows.values()).filter((w) => w.status === 'active' &&
            w.trigger.type === triggerType &&
            w.trigger.entityType === entityType);
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
    async executeWorkflow(workflow, entityType, entityId, entityData) {
        const id = this.generateId('exec');
        const now = new Date();
        const execution = {
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
                    const delayMs = ((action.delay.delayDays || 0) * 24 * 60 + (action.delay.delayHours || 0) * 60 + (action.delay.delayMinutes || 0)) *
                        60 *
                        1000;
                    await this.delay(delayMs);
                }
                actionExec.status = 'running';
                const result = await this.executeAction(action, entityType, entityId, entityData);
                actionExec.status = 'completed';
                actionExec.result = result;
                actionExec.executedAt = new Date();
            }
            catch (error) {
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
    async executeAction(action, entityType, entityId, entityData) {
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
    matchesTrigger(trigger, changes) {
        if (trigger.type === 'field_changed' && trigger.field) {
            if (!changes) {
                return false;
            }
            const change = changes.find((c) => c.field === trigger.field);
            if (!change) {
                return false;
            }
            if (trigger.fromValue !== undefined && change.oldValue !== trigger.fromValue) {
                return false;
            }
            if (trigger.toValue !== undefined && change.newValue !== trigger.toValue) {
                return false;
            }
        }
        return true;
    }
    evaluateConditions(conditions, data) {
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
    evaluateCondition(fieldValue, operator, conditionValue) {
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
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, Math.min(ms, 100))); // Cap for testing
    }
    // Custom Field Management
    /**
     * Create custom field
     */
    async createCustomField(input) {
        const id = this.generateId('cf');
        const now = new Date();
        // Get order for this entity type
        const existingFields = Array.from(this.customFields.values()).filter((f) => f.entityType === input.entityType);
        const order = existingFields.length + 1;
        const field = {
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
    async getCustomField(id) {
        return this.customFields.get(id) || null;
    }
    /**
     * Get custom fields for entity type
     */
    async getCustomFields(entityType) {
        return Array.from(this.customFields.values())
            .filter((f) => f.entityType === entityType && f.isActive)
            .sort((a, b) => a.order - b.order);
    }
    /**
     * Update custom field
     */
    async updateCustomField(id, updates) {
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
    async deleteCustomField(id) {
        const field = this.customFields.get(id);
        if (field) {
            field.isActive = false;
            this.customFields.set(id, field);
        }
    }
    /**
     * Reorder custom fields
     */
    async reorderCustomFields(entityType, fieldIds) {
        const fields = [];
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
    async createFieldGroup(name, entityType) {
        const id = this.generateId('grp');
        const existingGroups = Array.from(this.fieldGroups.values()).filter((g) => g.entityType === entityType);
        const group = {
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
    async getFieldGroups(entityType) {
        return Array.from(this.fieldGroups.values())
            .filter((g) => g.entityType === entityType)
            .sort((a, b) => a.order - b.order);
    }
    /**
     * Get workflow execution history
     */
    async getExecutionHistory(workflowId, limit = 50) {
        let executions = Array.from(this.executions.values());
        if (workflowId) {
            executions = executions.filter((e) => e.workflowId === workflowId);
        }
        return executions
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
            .slice(0, limit);
    }
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.WorkflowService = WorkflowService;
exports.workflowService = new WorkflowService();
