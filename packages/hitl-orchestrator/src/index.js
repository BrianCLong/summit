"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HITLOrchestrator = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
class HITLOrchestrator {
    app;
    tasks;
    constructor() {
        this.app = (0, express_1.default)();
        this.app.use(body_parser_1.default.json({ limit: '1mb' }));
        this.tasks = new Map();
        this.app.post('/tasks/create', this.createTask.bind(this));
        this.app.post('/tasks/review/:taskId', this.reviewTask.bind(this));
        this.app.get('/tasks/:taskId', this.getTask.bind(this));
        this.app.get('/tasks', this.getAllTasks.bind(this));
    }
    createTask(req, res) {
        const { workflowId, data } = req.body;
        const taskId = `task-${Date.now()}`;
        const newTask = {
            taskId,
            workflowId,
            data,
            status: 'pending',
        };
        this.tasks.set(taskId, newTask);
        res.status(201).json(newTask);
    }
    reviewTask(req, res) {
        const { taskId } = req.params;
        const { reviewerId, decision } = req.body;
        const task = this.tasks.get(taskId);
        if (!task) {
            return res.status(404).send('Task not found');
        }
        task.reviewerId = reviewerId;
        task.decision = decision;
        task.status = decision === 'approved' ? 'approved' : 'rejected';
        res.status(200).json(task);
    }
    getTask(req, res) {
        const { taskId } = req.params;
        const task = this.tasks.get(taskId);
        if (!task) {
            return res.status(404).send('Task not found');
        }
        res.status(200).json(task);
    }
    getAllTasks(_req, res) {
        res.status(200).json(Array.from(this.tasks.values()));
    }
    start(port) {
        this.app.listen(port, () => {
            // console.log(`HITL Orchestrator listening on port ${port}`);
        });
    }
}
exports.HITLOrchestrator = HITLOrchestrator;
