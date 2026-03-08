"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelAbuseWatch = void 0;
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const log = pino_1.default({ name: 'ModelAbuseWatch' });
class ModelAbuseWatch {
    abuseCounts = {};
    persistencePath = path_1.default.join(process.cwd(), 'abuse_watch_state.json');
    constructor() {
        this.loadState();
    }
    trackRequest(userId, prompt, output) {
        if (this.isAbusive(prompt) || this.isHarmful(output)) {
            this.abuseCounts[userId] = (this.abuseCounts[userId] || 0) + 1;
            this.saveState(); // Simple file persistence for prototype
            log.warn({ userId, prompt, output }, 'Abuse detected');
            if (this.abuseCounts[userId] > 5) {
                this.triggerQuarantine(userId);
            }
        }
    }
    isAbusive(text) {
        const jailbreakPatterns = ['ignore previous instructions', 'do anything now'];
        return jailbreakPatterns.some(p => text.toLowerCase().includes(p));
    }
    isHarmful(text) {
        // Placeholder for toxicity detector
        return false;
    }
    triggerQuarantine(userId) {
        log.error({ userId }, 'User quarantined due to excessive abuse attempts');
        // TODO: Update user status in real DB
        // const pool = getPostgresPool();
        // await pool.query('UPDATE users SET status = "quarantined" WHERE id = $1', [userId]);
    }
    saveState() {
        try {
            fs_1.default.writeFileSync(this.persistencePath, JSON.stringify(this.abuseCounts));
        }
        catch (e) {
            log.error(e, 'Failed to persist abuse state');
        }
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(this.persistencePath)) {
                const data = fs_1.default.readFileSync(this.persistencePath, 'utf-8');
                this.abuseCounts = JSON.parse(data);
            }
        }
        catch (e) {
            log.error(e, 'Failed to load abuse state');
        }
    }
}
exports.ModelAbuseWatch = ModelAbuseWatch;
