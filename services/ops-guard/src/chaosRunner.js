"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosRunner = void 0;
const crypto_1 = require("crypto");
const scenarios = [
    'graph-saturation-surge',
    'partial-metrics-outage',
    'planner-cost-regression'
];
const followUps = [
    'Create incident follow-up to tighten admission control',
    'Add replay for dropped telemetry batches',
    'Regenerate cached neighborhood indexes'
];
const lessons = [
    'Pre-warm caches before surge windows',
    'Fail-open is acceptable for observability-only paths',
    'Budget gates should degrade gracefully'
];
class ChaosRunner {
    config;
    logger;
    history = [];
    timer = null;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    start() {
        if (this.timer)
            return;
        this.timer = setInterval(() => {
            this.run();
        }, this.config.chaosIntervalMs);
    }
    stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
    }
    run() {
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        const outcome = Math.random() > 0.3 ? 'recovered' : 'degraded';
        const sloDelta = outcome === 'recovered' ? 0.05 : -0.1;
        const run = {
            scenario,
            followUpTasks: [
                `${(0, crypto_1.randomUUID)()}: ${followUps[Math.floor(Math.random() * followUps.length)]}`
            ],
            lessonsLearned: [lessons[Math.floor(Math.random() * lessons.length)]],
            outcome,
            sloDelta,
            timestamp: Date.now()
        };
        this.history.push(run);
        this.logger.info(run, 'Chaos drill completed');
        return run;
    }
    getTasks() {
        return this.history.flatMap((run) => run.followUpTasks);
    }
    sloTrend() {
        const cumulativeDelta = this.history.reduce((acc, run) => acc + run.sloDelta, 0);
        return { runs: this.history.length, cumulativeDelta };
    }
}
exports.ChaosRunner = ChaosRunner;
