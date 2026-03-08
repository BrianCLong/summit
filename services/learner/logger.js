"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logLearnerMetric = logLearnerMetric;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE = path_1.default.join(__dirname, '../../runs/learner-metrics.jsonl');
function logLearnerMetric(data) {
    const logEntry = JSON.stringify(data) + '\n';
    fs_1.default.appendFileSync(LOG_FILE, logEntry, 'utf8');
}
