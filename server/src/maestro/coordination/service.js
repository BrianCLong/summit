"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.coordinationService = exports.CoordinationService = void 0;
const budget_manager_js_1 = require("./budget-manager.js");
const MaestroService_js_1 = require("../MaestroService.js"); // We know this exists and has logAudit
const logger_js_1 = require("../../utils/logger.js");
const crypto = __importStar(require("node:crypto"));
class CoordinationService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!CoordinationService.instance) {
            CoordinationService.instance = new CoordinationService();
        }
        return CoordinationService.instance;
    }
    startCoordination(initiatorAgentId, schema, budget, parentContextId) {
        const coordinationId = crypto.randomUUID();
        const context = {
            coordinationId,
            schema, // Store schema for validation
            schemaVersion: schema.version,
            initiatorAgentId,
            roles: {
                [initiatorAgentId]: 'COORDINATOR' // Defaulting initiator to coordinator, can be changed
            },
            budget,
            budgetConsumed: {
                totalSteps: 0,
                totalTokens: 0,
                wallClockTimeMs: 0
            },
            status: 'ACTIVE',
            startTime: new Date(),
            parent: parentContextId
        };
        budget_manager_js_1.budgetManager.initialize(context);
        // Log start
        Promise.resolve(MaestroService_js_1.maestroService.logAudit(initiatorAgentId, 'coordination_start', coordinationId, `Started coordination with schema ${schema.version} and budget ${JSON.stringify(budget)}`)).catch(err => logger_js_1.logger.error(`Failed to audit coordination start: ${err}`));
        return coordinationId;
    }
    validateAction(coordinationId, agentId, role) {
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        if (!context)
            return false;
        // Auto-register if not present (assuming implicit permission for now to unblock execution)
        // In a stricter system, this would be a separate explicit 'Delegate' step.
        if (!context.roles[agentId]) {
            this.registerAgent(coordinationId, agentId, role);
        }
        // Verify agent has the role
        if (context.roles[agentId] !== role)
            return false;
        // Budget check
        const budgetCheck = budget_manager_js_1.budgetManager.checkBudget(coordinationId);
        if (!budgetCheck.allowed) {
            if (context.status === 'ACTIVE') {
                this.killCoordination(coordinationId, budgetCheck.reason || 'Budget exhausted');
            }
            return false;
        }
        return true;
    }
    registerAgent(coordinationId, agentId, role) {
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        if (!context)
            throw new Error('Context not found');
        // Verify role allowed by schema
        if (!context.schema.roles.includes(role)) {
            logger_js_1.logger.warn(`Agent ${agentId} attempted to join as invalid role ${role} for schema ${context.schema.name}`);
            return; // Or throw, but failing silently/warn is often safer for async checks
        }
        context.roles[agentId] = role;
        Promise.resolve(MaestroService_js_1.maestroService.logAudit('system', 'agent_join', coordinationId, `Agent ${agentId} joined as ${role}`)).catch(err => logger_js_1.logger.error(err));
    }
    consumeBudget(coordinationId, usage) {
        budget_manager_js_1.budgetManager.consumeBudget(coordinationId, usage);
        // Check if we need to kill
        const check = budget_manager_js_1.budgetManager.checkBudget(coordinationId);
        if (!check.allowed) {
            this.killCoordination(coordinationId, check.reason || 'Budget limit reached');
        }
    }
    killCoordination(coordinationId, reason) {
        const context = budget_manager_js_1.budgetManager.get(coordinationId);
        if (!context || context.status !== 'ACTIVE')
            return;
        context.status = 'TERMINATED';
        context.endTime = new Date();
        context.terminationReason = reason;
        logger_js_1.logger.warn(`Killing coordination ${coordinationId}: ${reason}`);
        Promise.resolve(MaestroService_js_1.maestroService.logAudit('system', 'coordination_kill', coordinationId, `Coordination terminated: ${reason}`)).catch(err => logger_js_1.logger.error(err));
        // Here we would ideally emit an event to cancel all running tasks for this coordination ID
        // Since we don't have direct access to the Engine's Queue here, we rely on the Engine checking the status
        // before executing/processing tasks.
    }
}
exports.CoordinationService = CoordinationService;
exports.coordinationService = CoordinationService.getInstance();
