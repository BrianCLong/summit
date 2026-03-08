"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceStateMachine = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class GovernanceStateMachine {
    validTransitions;
    constructor() {
        // Load transitions from config if available, otherwise default
        try {
            const configPath = path_1.default.join(process.cwd(), '../governance/state-transitions.json');
            if (fs_1.default.existsSync(configPath)) {
                const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
                this.validTransitions = config.transitions;
            }
            else {
                // Fallback default
                this.validTransitions = {
                    'draft': ['reviewed', 'retired'],
                    'reviewed': ['approved', 'draft', 'blocked'],
                    'approved': ['retired', 'blocked'],
                    'blocked': ['draft', 'retired'],
                    'retired': []
                };
            }
        }
        catch (e) {
            this.validTransitions = {
                'draft': ['reviewed', 'retired'],
                'reviewed': ['approved', 'draft', 'blocked'],
                'approved': ['retired', 'blocked'],
                'blocked': ['draft', 'retired'],
                'retired': []
            };
        }
    }
    canTransition(from, to) {
        return this.validTransitions[from]?.includes(to) || false;
    }
    transition(artifact, to, actor) {
        if (!this.canTransition(artifact.state, to)) {
            throw new Error(`Invalid transition from ${artifact.state} to ${to}`);
        }
        artifact.state = to;
        artifact.history.push({
            state: to,
            timestamp: new Date().toISOString(),
            actor
        });
        return artifact;
    }
}
exports.GovernanceStateMachine = GovernanceStateMachine;
