"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// services/scheduler/scheduler-api.ts
const express_1 = __importDefault(require("express"));
const admission_controller_1 = require("./admission/admission-controller");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/api/conductor/v1/scheduler/enqueue', (0, admission_controller_1.admissionMiddleware)(), (req, res) => {
    // enqueue job with possibly mutated exploration_percent
    // ... existing logic
    res.status(202).json({
        jobId: '...',
        exploration_percent: req.body.exploration_percent,
    });
});
