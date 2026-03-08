"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maestroGlobalAgent = exports.MaestroGlobalAgent = void 0;
const GlobalTrafficSteering_js_1 = require("../../runtime/global/GlobalTrafficSteering.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class MaestroGlobalAgent {
    static instance;
    constructor() { }
    static getInstance() {
        if (!MaestroGlobalAgent.instance) {
            MaestroGlobalAgent.instance = new MaestroGlobalAgent();
        }
        return MaestroGlobalAgent.instance;
    }
    /**
     * Determines if a task can be executed in the current region for the given tenant.
     * If not, it provides steering advice.
     */
    async evaluateRouting(task) {
        const tenantId = task.input?.tenantId;
        if (!tenantId) {
            return {
                allowed: true,
                action: 'STAY',
                reason: 'System operation or missing tenant context'
            };
        }
        const decision = await GlobalTrafficSteering_js_1.globalTrafficSteering.resolveRegion(tenantId);
        if (!decision.isOptimal) {
            // Log the sub-optimal routing for observability
            logger_js_1.default.warn({
                taskId: task.id,
                tenantId,
                currentRegion: process.env.SUMMIT_REGION || 'us-east-1',
                optimalRegion: decision.targetRegion,
                reason: decision.reason
            }, 'Maestro Global Steering Advice: Sub-optimal region detected');
            return {
                allowed: false,
                action: 'REDIRECT',
                advice: decision.targetRegion,
                reason: decision.reason
            };
        }
        return {
            allowed: true,
            action: 'STAY',
            reason: 'Routing is optimal'
        };
    }
}
exports.MaestroGlobalAgent = MaestroGlobalAgent;
exports.maestroGlobalAgent = MaestroGlobalAgent.getInstance();
