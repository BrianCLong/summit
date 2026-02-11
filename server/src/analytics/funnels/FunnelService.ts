import fs from 'fs';
import path from 'path';
import { Funnel, FunnelReport, FunnelStep } from './types.js';
import { TelemetryEvent } from '../telemetry/types.js';

export class FunnelService {
    private logDir: string;
    private funnels: Map<string, Funnel> = new Map();

    constructor(logDir: string) {
        this.logDir = logDir;
    }

    public createFunnel(funnel: Funnel): void {
        this.funnels.set(funnel.id, funnel);
    }

    public getFunnel(id: string): Funnel | undefined {
        return this.funnels.get(id);
    }

    public generateReport(funnelId: string): FunnelReport {
        const funnel = this.funnels.get(funnelId);
        if (!funnel) {
            throw new Error('Funnel not found');
        }

        // BOLT OPTIMIZATION: Prevent DoS from excessively large funnel definitions
        if (!Array.isArray(funnel.steps) || funnel.steps.length > 1000) {
            throw new Error('Funnel too complex or invalid');
        }

        const userEvents = this.loadUserEvents();

        const stepCounts: Record<string, number> = {};
        for (let i = 0; i < funnel.steps.length; i++) {
            stepCounts[i] = 0;
        }

        for (const [userId, events] of userEvents.entries()) {
            // Sort by time
            events.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

            this.evaluateUser(userId, events, funnel, stepCounts);
        }

        const totalStarted = stepCounts[0];
        const completed = stepCounts[funnel.steps.length - 1];

        const dropOffRates: Record<string, number> = {};
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
    private evaluateUser(userId: string, events: TelemetryEvent[], funnel: Funnel, counts: Record<string, number>) {
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
            } else {
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

    private matchStep(event: TelemetryEvent, step: FunnelStep): boolean {
        if (event.eventType !== step.eventType) return false;
        if (step.props) {
            for (const [k, v] of Object.entries(step.props)) {
                if (event.props[k] !== v) return false;
            }
        }
        return true;
    }

    private loadUserEvents(): Map<string, TelemetryEvent[]> {
        // Scan all logs
        const map = new Map<string, TelemetryEvent[]>();
        if (!fs.existsSync(this.logDir)) return map;

        const files = fs.readdirSync(this.logDir).filter((f: string) => f.endsWith('.jsonl'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const e: TelemetryEvent = JSON.parse(line);
                    // Group by user hash
                    const uid = e.scopeHash;
                    if (!map.has(uid)) map.set(uid, []);
                    map.get(uid)!.push(e);
                } catch (err: any) { }
            }
        }
        return map;
    }
}
