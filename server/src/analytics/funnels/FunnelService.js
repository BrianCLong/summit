"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class FunnelService {
    logDir;
    funnels = new Map();
    constructor(logDir) {
        this.logDir = logDir;
    }
    createFunnel(funnel) {
        this.funnels.set(funnel.id, funnel);
    }
    getFunnel(id) {
        return this.funnels.get(id);
    }
    generateReport(funnelId) {
        const funnel = this.funnels.get(funnelId);
        if (!funnel)
            throw new Error('Funnel not found');
        const userEvents = this.loadUserEvents();
        const stepCounts = {};
        for (let i = 0; i < funnel.steps.length; i++)
            stepCounts[i] = 0;
        for (const [userId, events] of userEvents.entries()) {
            // Sort by time
            events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
            this.evaluateUser(userId, events, funnel, stepCounts);
        }
        const totalStarted = stepCounts[0];
        const completed = stepCounts[funnel.steps.length - 1];
        const dropOffRates = {};
        for (let i = 1; i < funnel.steps.length; i++) {
            const prev = stepCounts[i - 1];
            const curr = stepCounts[i];
            dropOffRates[i] = prev === 0 ? 0 : ((prev - curr) / prev) * 100;
        }
        return {
            funnelId,
            totalStarted,
            completed,
            stepCounts,
            dropOffRates
        };
    }
    // Naive evaluation: greedy matching of steps within window
    evaluateUser(userId, events, funnel, counts) {
        let currentStepIdx = 0;
        let startTime = 0;
        // Simple state machine: look for step 0, then step 1, etc.
        // If window expires, reset? Or strict sequential?
        // "Standardized funnel definitions": usually implies strict order A->B->C within window.
        // We scan events. If we find Step 0, we start a session.
        // MVP: Just find if the user COMPLETED the funnel at least once, or how deep they got in their *best* attempt.
        // Let's track max step reached.
        let maxStepReached = -1;
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            // If we haven't started, look for step 0
            if (maxStepReached === -1) {
                if (this.matchStep(e, funnel.steps[0])) {
                    maxStepReached = 0;
                    startTime = new Date(e.ts).getTime();
                }
            }
            else {
                // Look for next step
                const nextStepIdx = maxStepReached + 1;
                if (nextStepIdx < funnel.steps.length) {
                    // Check time window
                    const now = new Date(e.ts).getTime();
                    if (now - startTime > funnel.windowSeconds * 1000) {
                        // Window expired.
                        // Should we restart? For MVP, let's just say this attempt failed.
                        // Ideally we keep sliding. But simplified:
                        // If we see step 0 again, do we reset?
                        if (this.matchStep(e, funnel.steps[0])) {
                            maxStepReached = 0;
                            startTime = now;
                        }
                        continue;
                    }
                    if (this.matchStep(e, funnel.steps[nextStepIdx])) {
                        maxStepReached = nextStepIdx;
                    }
                }
            }
        }
        // Increment counts for all steps reached
        for (let k = 0; k <= maxStepReached; k++) {
            counts[k]++;
        }
    }
    matchStep(event, step) {
        if (event.eventType !== step.eventType)
            return false;
        if (step.props) {
            for (const [k, v] of Object.entries(step.props)) {
                if (event.props[k] !== v)
                    return false;
            }
        }
        return true;
    }
    loadUserEvents() {
        // Scan all logs
        const map = new Map();
        if (!fs_1.default.existsSync(this.logDir))
            return map;
        const files = fs_1.default.readdirSync(this.logDir).filter((f) => f.endsWith('.jsonl'));
        for (const file of files) {
            const content = fs_1.default.readFileSync(path_1.default.join(this.logDir, file), 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const e = JSON.parse(line);
                    // Group by user hash
                    const uid = e.scopeHash;
                    if (!map.has(uid))
                        map.set(uid, []);
                    map.get(uid).push(e);
                }
                catch (err) { }
            }
        }
        return map;
    }
}
exports.FunnelService = FunnelService;
