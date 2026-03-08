"use strict";
/**
 * Task Service
 * Manages tasks, reminders, and follow-up scheduling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = exports.TaskService = void 0;
const events_1 = require("events");
class TaskService extends events_1.EventEmitter {
    tasks = new Map();
    reminders = new Map();
    reminderTimers = new Map();
    constructor() {
        super();
    }
    /**
     * Create a new task
     */
    async create(input, userId) {
        const id = this.generateId();
        const now = new Date();
        const task = {
            id,
            title: input.title,
            description: input.description,
            type: input.type || 'todo',
            priority: input.priority || 'medium',
            status: 'pending',
            dueDate: input.dueDate,
            dueTime: input.dueTime,
            reminderAt: input.reminderAt,
            contactIds: input.contactIds || [],
            companyId: input.companyId,
            dealId: input.dealId,
            ownerId: userId,
            assigneeId: input.assigneeId,
            createdById: userId,
            isRecurring: input.isRecurring || false,
            recurrence: input.recurrence,
            subtasks: [],
            tags: input.tags || [],
            createdAt: now,
            updatedAt: now,
        };
        this.tasks.set(id, task);
        // Schedule reminder if set
        if (input.reminderAt) {
            await this.scheduleReminder(task);
        }
        this.emit('task:created', task);
        return task;
    }
    /**
     * Get task by ID
     */
    async getById(id) {
        return this.tasks.get(id) || null;
    }
    /**
     * Update task
     */
    async update(id, input, userId) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        const updatedTask = { ...task, ...input, updatedAt: new Date() };
        this.tasks.set(id, updatedTask);
        // Update reminder if changed
        if (input.reminderAt !== undefined) {
            this.cancelReminder(id);
            if (input.reminderAt) {
                await this.scheduleReminder(updatedTask);
            }
        }
        this.emit('task:updated', updatedTask);
        return updatedTask;
    }
    /**
     * Complete task
     */
    async complete(id, result, userId) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        task.status = 'completed';
        task.completedAt = new Date();
        task.completedById = userId;
        task.result = result;
        task.updatedAt = new Date();
        this.tasks.set(id, task);
        this.cancelReminder(id);
        this.emit('task:completed', task);
        // Create next occurrence if recurring
        if (task.isRecurring && task.recurrence) {
            await this.createNextRecurrence(task);
        }
        return task;
    }
    /**
     * Reopen task
     */
    async reopen(id) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        task.status = 'pending';
        task.completedAt = undefined;
        task.completedById = undefined;
        task.result = undefined;
        task.updatedAt = new Date();
        this.tasks.set(id, task);
        this.emit('task:reopened', task);
        return task;
    }
    /**
     * Defer task
     */
    async defer(id, newDueDate) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        task.status = 'deferred';
        task.dueDate = newDueDate;
        task.updatedAt = new Date();
        this.tasks.set(id, task);
        this.emit('task:deferred', task);
        return task;
    }
    /**
     * Cancel task
     */
    async cancel(id) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        task.status = 'cancelled';
        task.updatedAt = new Date();
        this.tasks.set(id, task);
        this.cancelReminder(id);
        this.emit('task:cancelled', task);
        return task;
    }
    /**
     * Delete task
     */
    async delete(id) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        this.tasks.delete(id);
        this.cancelReminder(id);
        this.emit('task:deleted', task);
    }
    /**
     * Search tasks
     */
    async search(params) {
        let results = Array.from(this.tasks.values());
        if (params.assigneeId) {
            results = results.filter((t) => t.assigneeId === params.assigneeId);
        }
        if (params.ownerId) {
            results = results.filter((t) => t.ownerId === params.ownerId);
        }
        if (params.status?.length) {
            results = results.filter((t) => params.status.includes(t.status));
        }
        if (params.type?.length) {
            results = results.filter((t) => params.type.includes(t.type));
        }
        if (params.priority?.length) {
            results = results.filter((t) => params.priority.includes(t.priority));
        }
        if (params.contactId) {
            results = results.filter((t) => t.contactIds.includes(params.contactId));
        }
        if (params.companyId) {
            results = results.filter((t) => t.companyId === params.companyId);
        }
        if (params.dealId) {
            results = results.filter((t) => t.dealId === params.dealId);
        }
        if (params.dueDateFrom) {
            results = results.filter((t) => t.dueDate && t.dueDate >= params.dueDateFrom);
        }
        if (params.dueDateTo) {
            results = results.filter((t) => t.dueDate && t.dueDate <= params.dueDateTo);
        }
        if (params.overdue) {
            const now = new Date();
            results = results.filter((t) => t.status !== 'completed' &&
                t.status !== 'cancelled' &&
                t.dueDate &&
                t.dueDate < now);
        }
        if (params.tags?.length) {
            results = results.filter((t) => params.tags.some((tag) => t.tags.includes(tag)));
        }
        // Sort
        const sortBy = params.sortBy || 'dueDate';
        const sortOrder = params.sortOrder || 'asc';
        results.sort((a, b) => {
            const aVal = a[sortBy] ?? '';
            const bVal = b[sortBy] ?? '';
            if (aVal < bVal) {
                return sortOrder === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
        // Paginate
        const page = params.page || 1;
        const limit = params.limit || 50;
        const start = (page - 1) * limit;
        return {
            tasks: results.slice(start, start + limit),
            total: results.length,
            page,
            limit,
        };
    }
    /**
     * Get task queue for user
     */
    async getQueue(userId) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const tasks = Array.from(this.tasks.values()).filter((t) => t.assigneeId === userId &&
            t.status !== 'completed' &&
            t.status !== 'cancelled');
        return {
            overdue: tasks
                .filter((t) => t.dueDate && t.dueDate < todayStart)
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
            today: tasks
                .filter((t) => t.dueDate && t.dueDate >= todayStart && t.dueDate < todayEnd)
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
            upcoming: tasks
                .filter((t) => t.dueDate && t.dueDate >= todayEnd && t.dueDate < weekEnd)
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
            noDueDate: tasks.filter((t) => !t.dueDate),
        };
    }
    /**
     * Bulk create tasks
     */
    async bulkCreate(tasks, userId) {
        const created = [];
        for (const input of tasks) {
            const task = await this.create(input, userId);
            created.push(task);
        }
        return created;
    }
    /**
     * Reassign task
     */
    async reassign(id, newAssigneeId, userId) {
        const task = await this.getById(id);
        if (!task) {
            throw new Error(`Task ${id} not found`);
        }
        const oldAssigneeId = task.assigneeId;
        task.assigneeId = newAssigneeId;
        task.updatedAt = new Date();
        this.tasks.set(id, task);
        this.emit('task:reassigned', task, oldAssigneeId, newAssigneeId);
        return task;
    }
    /**
     * Create subtask
     */
    async createSubtask(parentId, input, userId) {
        const parent = await this.getById(parentId);
        if (!parent) {
            throw new Error(`Parent task ${parentId} not found`);
        }
        const subtask = await this.create(input, userId);
        subtask.parentTaskId = parentId;
        this.tasks.set(subtask.id, subtask);
        parent.subtasks.push(subtask.id);
        this.tasks.set(parentId, parent);
        return subtask;
    }
    /**
     * Get tasks summary
     */
    async getSummary(userId) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const tasks = Array.from(this.tasks.values()).filter((t) => t.assigneeId === userId);
        const byPriority = {};
        const byType = {};
        for (const task of tasks) {
            byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
            byType[task.type] = (byType[task.type] || 0) + 1;
        }
        return {
            total: tasks.length,
            completed: tasks.filter((t) => t.status === 'completed').length,
            overdue: tasks.filter((t) => t.status !== 'completed' &&
                t.status !== 'cancelled' &&
                t.dueDate &&
                t.dueDate < todayStart).length,
            dueToday: tasks.filter((t) => t.status !== 'completed' &&
                t.status !== 'cancelled' &&
                t.dueDate &&
                t.dueDate >= todayStart &&
                t.dueDate < todayEnd).length,
            byPriority,
            byType,
        };
    }
    // Reminder management
    async scheduleReminder(task) {
        if (!task.reminderAt || task.reminderAt <= new Date()) {
            return;
        }
        const reminder = {
            id: `rem_${task.id}`,
            taskId: task.id,
            userId: task.assigneeId,
            title: `Reminder: ${task.title}`,
            message: task.description,
            reminderAt: task.reminderAt,
            sent: false,
            channel: ['in_app', 'email'],
            dismissed: false,
            createdAt: new Date(),
        };
        this.reminders.set(reminder.id, reminder);
        const delay = task.reminderAt.getTime() - Date.now();
        const timer = setTimeout(() => this.triggerReminder(reminder.id), delay);
        this.reminderTimers.set(reminder.id, timer);
    }
    cancelReminder(taskId) {
        const reminderId = `rem_${taskId}`;
        const timer = this.reminderTimers.get(reminderId);
        if (timer) {
            clearTimeout(timer);
            this.reminderTimers.delete(reminderId);
        }
        this.reminders.delete(reminderId);
    }
    async triggerReminder(reminderId) {
        const reminder = this.reminders.get(reminderId);
        if (!reminder || reminder.dismissed) {
            return;
        }
        reminder.sent = true;
        reminder.sentAt = new Date();
        this.reminders.set(reminderId, reminder);
        this.emit('reminder:triggered', reminder);
    }
    /**
     * Snooze reminder
     */
    async snoozeReminder(reminderId, minutes) {
        const reminder = this.reminders.get(reminderId);
        if (!reminder) {
            throw new Error(`Reminder ${reminderId} not found`);
        }
        reminder.snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
        this.reminders.set(reminderId, reminder);
        // Reschedule
        const timer = this.reminderTimers.get(reminderId);
        if (timer) {
            clearTimeout(timer);
        }
        const newTimer = setTimeout(() => this.triggerReminder(reminderId), minutes * 60 * 1000);
        this.reminderTimers.set(reminderId, newTimer);
        return reminder;
    }
    /**
     * Dismiss reminder
     */
    async dismissReminder(reminderId) {
        const reminder = this.reminders.get(reminderId);
        if (reminder) {
            reminder.dismissed = true;
            this.reminders.set(reminderId, reminder);
        }
        this.cancelReminder(reminderId.replace('rem_', ''));
    }
    async createNextRecurrence(task) {
        if (!task.recurrence) {
            return null;
        }
        let nextDueDate;
        const currentDue = task.dueDate || new Date();
        switch (task.recurrence.frequency) {
            case 'daily':
                nextDueDate = new Date(currentDue.getTime() + task.recurrence.interval * 24 * 60 * 60 * 1000);
                break;
            case 'weekly':
                nextDueDate = new Date(currentDue.getTime() + task.recurrence.interval * 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                nextDueDate = new Date(currentDue);
                nextDueDate.setMonth(nextDueDate.getMonth() + task.recurrence.interval);
                break;
            case 'yearly':
                nextDueDate = new Date(currentDue);
                nextDueDate.setFullYear(nextDueDate.getFullYear() + task.recurrence.interval);
                break;
        }
        // Check end conditions
        if (task.recurrence.endDate && nextDueDate && nextDueDate > task.recurrence.endDate) {
            return null;
        }
        if (nextDueDate) {
            return this.create({
                title: task.title,
                description: task.description,
                type: task.type,
                priority: task.priority,
                dueDate: nextDueDate,
                dueTime: task.dueTime,
                contactIds: task.contactIds,
                companyId: task.companyId,
                dealId: task.dealId,
                assigneeId: task.assigneeId,
                isRecurring: true,
                recurrence: task.recurrence,
                tags: task.tags,
            }, task.ownerId);
        }
        return null;
    }
    generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.TaskService = TaskService;
exports.taskService = new TaskService();
