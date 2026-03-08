"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchableOrchestrator = void 0;
exports.createLaunchableOrchestrator = createLaunchableOrchestrator;
const modules_1 = require("./modules");
class LaunchableOrchestrator {
    modules = new Map();
    tasks = [];
    listeners = new Map();
    constructor(modules = modules_1.defaultModules) {
        modules.forEach((module) => this.addModule(module));
    }
    addModule(module) {
        this.modules.set(module.definition.id, module);
        this.emit('module:status', {
            moduleId: module.definition.id,
            status: this.decorateStatus(module.getStatus()),
        });
    }
    hasModule(moduleId) {
        return this.modules.has(moduleId);
    }
    getModule(moduleId) {
        return this.modules.get(moduleId);
    }
    listModules() {
        return Array.from(this.modules.values()).map((module) => ({
            definition: module.definition,
            status: this.decorateStatus(module.getStatus()),
        }));
    }
    async startAll() {
        const statuses = [];
        for (const module of this.modules.values()) {
            const status = this.decorateStatus(await module.start());
            statuses.push({ definition: module.definition, status });
            this.emit('module:status', {
                moduleId: module.definition.id,
                status,
            });
        }
        return statuses;
    }
    async stopAll() {
        for (const module of this.modules.values()) {
            const status = this.decorateStatus(await module.stop());
            this.emit('module:status', {
                moduleId: module.definition.id,
                status,
            });
        }
    }
    async dispatchTask(task) {
        const record = {
            task,
            startedAt: new Date().toISOString(),
            status: 'running',
            results: [],
        };
        this.tasks = [record, ...this.tasks];
        this.emit('task:started', record);
        const validationIssues = this.validateTask(task);
        if (validationIssues.length > 0) {
            record.status = 'error';
            record.completedAt = new Date().toISOString();
            record.results = validationIssues.map((issue) => this.buildErrorResult(issue.moduleId, issue.action, issue.message));
            this.emit('task:error', record);
            return record;
        }
        for (const action of task.actions) {
            const module = this.modules.get(action.moduleId);
            if (!module) {
                const errorMessage = `Module ${action.moduleId} not registered`;
                const errorResult = this.buildErrorResult(action.moduleId, action.action, errorMessage);
                record.status = 'error';
                record.completedAt = new Date().toISOString();
                record.results.push(errorResult);
                this.emit('task:error', record);
                return record;
            }
            module.queueTask();
            this.emit('module:status', {
                moduleId: module.definition.id,
                status: this.decorateStatus(module.getStatus()),
            });
            try {
                const result = await module.executeTask(task, action);
                record.results.push(result);
                this.emit('module:status', {
                    moduleId: module.definition.id,
                    status: this.decorateStatus(module.getStatus()),
                });
            }
            catch (error) {
                const failure = this.buildErrorResult(module.definition.id, action.action, error instanceof Error ? error.message : 'Unknown error');
                record.results.push(failure);
                record.status = 'error';
                record.completedAt = new Date().toISOString();
                this.emit('module:status', {
                    moduleId: module.definition.id,
                    status: this.decorateStatus(module.getStatus()),
                });
                this.emit('task:error', record);
                return record;
            }
        }
        record.status = 'completed';
        record.completedAt = new Date().toISOString();
        this.emit('task:completed', record);
        return record;
    }
    getSnapshot() {
        return {
            modules: this.listModules(),
            tasks: this.tasks.map((task) => ({
                ...task,
                results: [...task.results],
            })),
        };
    }
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const listeners = this.listeners.get(event);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }
    emit(event, payload) {
        const listeners = this.listeners.get(event);
        if (!listeners) {
            return;
        }
        listeners.forEach((listener) => listener(payload));
    }
    validateTask(task) {
        const issues = [];
        for (const action of task.actions) {
            const module = this.modules.get(action.moduleId);
            if (!module) {
                issues.push({
                    moduleId: action.moduleId,
                    action: action.action,
                    message: `Module "${action.moduleId}" is not registered with the orchestrator`,
                });
                continue;
            }
            if (!module.supportsAction(action.action)) {
                issues.push({
                    moduleId: module.definition.id,
                    action: action.action,
                    message: `${module.definition.displayName} does not support action "${action.action}"`,
                });
            }
        }
        return issues;
    }
    decorateStatus(status) {
        if (status.startedAt) {
            const uptimeMs = Date.now() - new Date(status.startedAt).getTime();
            return { ...status, uptimeMs };
        }
        return status;
    }
    buildErrorResult(moduleId, action, message) {
        return {
            moduleId,
            action,
            status: 'error',
            message,
            output: { message },
            durationMs: 0,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.LaunchableOrchestrator = LaunchableOrchestrator;
function createLaunchableOrchestrator(modules = modules_1.defaultModules) {
    return new LaunchableOrchestrator(modules);
}
