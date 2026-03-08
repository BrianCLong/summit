"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveLoadService = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'CognitiveLoadService' });
class CognitiveLoadService {
    static MAX_LOAD = 1.0;
    static THRESHOLD = 0.96; // 4% remaining
    static async reportLoad(analystId, metrics) {
        const load = this.calculateLoad(metrics);
        if (load > this.THRESHOLD) {
            await this.rerouteTasks(analystId);
        }
    }
    static calculateLoad(metrics) {
        // Simulated calculation
        // High mouse velocity + high dwell entropy = high load
        return Math.random(); // Simulation
    }
    static async rerouteTasks(analystId) {
        logger.info({ analystId }, 'Analyst approaching cognitive overload (4% margin). Rerouting incoming tasks silently.');
        // Logic to update task assignment in DB would go here
    }
}
exports.CognitiveLoadService = CognitiveLoadService;
