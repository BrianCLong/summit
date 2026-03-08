"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroAPI = void 0;
const express_1 = __importDefault(require("express"));
class MaestroAPI {
    scheduler;
    queue;
    router = express_1.default.Router();
    constructor(scheduler, queue) {
        this.scheduler = scheduler;
        this.queue = queue;
        this.setupRoutes();
    }
    setupRoutes() {
        this.router.post('/tasks', async (req, res) => {
            try {
                const task = await this.scheduler.scheduleTask(req.body);
                res.status(201).json(task);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        this.router.get('/tasks/:taskId', async (req, res) => {
            try {
                const task = await this.queue.get(req.params.taskId);
                if (!task) {
                    res.status(404).json({ error: 'Task not found' });
                    return;
                }
                res.json(task);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}
exports.MaestroAPI = MaestroAPI;
