"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpicService = void 0;
const epicDefinitions_js_1 = require("../db/epicDefinitions.js");
const DEFAULT_STATUS = 'not_started';
class EpicService {
    definitions;
    state = new Map();
    clock;
    constructor(definitions = epicDefinitions_js_1.EPIC_DEFINITIONS, clock = () => new Date()) {
        this.definitions = definitions;
        this.clock = clock;
        this.seedState();
    }
    seedState() {
        const now = this.clock().toISOString();
        this.definitions.forEach((epic) => {
            epic.tasks.forEach((task) => {
                const key = this.buildKey(epic.id, task.id);
                if (!this.state.has(key)) {
                    this.state.set(key, {
                        id: task.id,
                        description: task.description,
                        status: DEFAULT_STATUS,
                        updatedAt: now,
                    });
                }
            });
        });
    }
    buildKey(epicId, taskId) {
        return `${epicId}:${taskId}`;
    }
    list() {
        return this.definitions.map((epic) => this.buildSnapshot(epic));
    }
    get(epicId) {
        const definition = this.definitions.find((item) => item.id === epicId);
        if (!definition)
            return null;
        return this.buildSnapshot(definition);
    }
    updateTask(epicId, taskId, payload) {
        const definition = this.definitions.find((item) => item.id === epicId);
        if (!definition) {
            throw new Error(`Epic ${epicId} not found`);
        }
        const taskDefinition = definition.tasks.find((task) => task.id === taskId);
        if (!taskDefinition) {
            throw new Error(`Task ${taskId} not found for epic ${epicId}`);
        }
        const key = this.buildKey(epicId, taskId);
        const now = this.clock().toISOString();
        this.state.set(key, {
            id: taskId,
            description: taskDefinition.description,
            status: payload.status,
            note: payload.note,
            owner: payload.owner,
            updatedAt: now,
        });
        return this.buildSnapshot(definition);
    }
    buildSnapshot(definition) {
        const tasks = definition.tasks.map((task) => {
            const key = this.buildKey(definition.id, task.id);
            const existing = this.state.get(key);
            return (existing ?? {
                id: task.id,
                description: task.description,
                status: DEFAULT_STATUS,
                updatedAt: this.clock().toISOString(),
            });
        });
        const completedCount = tasks.filter((task) => task.status === 'completed').length;
        const blockedCount = tasks.filter((task) => task.status === 'blocked').length;
        const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
        return {
            ...definition,
            tasks,
            completedCount,
            blockedCount,
            progress,
        };
    }
}
exports.EpicService = EpicService;
