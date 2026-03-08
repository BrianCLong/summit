"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const luxon_1 = require("luxon");
const getTaskFilePath = () => {
    if (fs_1.default.existsSync('.summit-tasks.yaml')) {
        return '.summit-tasks.yaml';
    }
    if (fs_1.default.existsSync('../../.summit-tasks.yaml')) {
        return '../../.summit-tasks.yaml';
    }
    return '.summit-tasks.yaml';
};
class Store {
    filePath;
    constructor() {
        this.filePath = getTaskFilePath();
    }
    load() {
        if (!fs_1.default.existsSync(this.filePath)) {
            return { tasks: [], velocity: {} };
        }
        const content = fs_1.default.readFileSync(this.filePath, 'utf8');
        const data = yaml_1.default.parse(content);
        return {
            tasks: data.tasks || [],
            velocity: data.velocity || {}
        };
    }
    save(data) {
        const content = yaml_1.default.stringify(data);
        fs_1.default.writeFileSync(this.filePath, content, 'utf8');
    }
    addTask(title) {
        const data = this.load();
        const id = `task-${Date.now()}`;
        const task = {
            id,
            title,
            status: 'active',
            created_at: luxon_1.DateTime.utc().toISO(),
            updated_at: luxon_1.DateTime.utc().toISO()
        };
        data.tasks.push(task);
        this.save(data);
        return task;
    }
    getTask(id) {
        const data = this.load();
        return data.tasks.find(t => t.id === id);
    }
    listTasks(status) {
        const data = this.load();
        if (status) {
            return data.tasks.filter(t => t.status === status);
        }
        return data.tasks.filter(t => t.status !== 'archived');
    }
    updateTaskStatus(id, status) {
        const data = this.load();
        const task = data.tasks.find(t => t.id === id);
        if (task) {
            task.status = status;
            task.updated_at = luxon_1.DateTime.utc().toISO();
            if (status === 'archived') {
                const today = luxon_1.DateTime.utc().toISODate();
                data.velocity[today] = (data.velocity[today] || 0) + 1;
            }
            this.save(data);
        }
        return task;
    }
    getVelocity() {
        return this.load().velocity;
    }
}
exports.Store = Store;
