"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulationAnalyticsService = exports.SimulationAnalyticsService = void 0;
const logger_js_1 = require("../config/logger.js");
/**
 * Service for aggregating narrative simulation analytics (Task #113).
 */
class SimulationAnalyticsService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SimulationAnalyticsService.instance) {
            SimulationAnalyticsService.instance = new SimulationAnalyticsService();
        }
        return SimulationAnalyticsService.instance;
    }
    /**
     * Aggregates time-series momentum data from a simulation state.
     */
    getMomentumHistory(state) {
        logger_js_1.logger.info({ simulationId: state.id }, 'SimulationAnalytics: Aggregating momentum history');
        const ticks = new Map();
        // 1. Process Arcs (Current state momentum)
        // In a real state, we would have historical snapshots of arcs per tick.
        // For now, we reconstruct from entity history if available.
        const maxTick = state.tick;
        for (let t = 0; t <= maxTick; t++) {
            const themeMomenta = {};
            let sentimentSum = 0;
            let influenceSum = 0;
            let entityCount = 0;
            for (const entity of Object.values(state.entities)) {
                const hist = entity.history.find(h => h.tick === t);
                if (hist) {
                    sentimentSum += hist.sentiment;
                    influenceSum += hist.influence;
                    entityCount++;
                    // Aggregate theme contribution
                    for (const [theme, weight] of Object.entries(entity.themes)) {
                        themeMomenta[theme] = (themeMomenta[theme] || 0) + (weight * hist.influence);
                    }
                }
            }
            const params = {};
            for (const param of Object.values(state.parameters)) {
                const pHist = param.history.find(h => h.tick === t);
                if (pHist) {
                    params[param.name] = pHist.value;
                }
            }
            ticks.set(t, {
                tick: t,
                timestamp: new Date(state.startedAt.getTime() + t * state.tickIntervalMinutes * 60000).toISOString(),
                themeMomenta,
                avgSentiment: entityCount > 0 ? sentimentSum / entityCount : 0,
                totalInfluence: influenceSum,
                parameters: params
            });
        }
        return Array.from(ticks.values()).sort((a, b) => a.tick - b.tick);
    }
}
exports.SimulationAnalyticsService = SimulationAnalyticsService;
exports.simulationAnalyticsService = SimulationAnalyticsService.getInstance();
