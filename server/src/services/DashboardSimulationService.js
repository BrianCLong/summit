"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardSimulation = void 0;
const socket_js_1 = require("../realtime/socket.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
class DashboardSimulationService {
    interval = null;
    io = null;
    start() {
        if (this.interval)
            return;
        logger.info('Starting Dashboard Simulation Service...');
        // Try to get IO instance. It might not be ready immediately on server start.
        const checkIO = setInterval(() => {
            this.io = (0, socket_js_1.getIO)();
            if (this.io) {
                clearInterval(checkIO);
                this.runSimulation();
            }
        }, 1000);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    runSimulation() {
        if (!this.io)
            return;
        const ns = this.io.of('/realtime');
        this.interval = setInterval(() => {
            try {
                const metrics = this.generateMetrics();
                const insights = this.generateInsights();
                const activity = this.generateActivity();
                const graphUpdates = this.generateGraphUpdates();
                // Broadcast to dashboard room
                ns.to('dashboard:main').emit('dashboard:metrics', metrics);
                if (Math.random() > 0.7) {
                    ns.to('dashboard:main').emit('dashboard:insights', insights);
                }
                if (Math.random() > 0.5) {
                    ns.to('dashboard:main').emit('dashboard:activity', activity);
                }
                if (Math.random() > 0.3) {
                    ns.to('dashboard:main').emit('dashboard:graph_update', graphUpdates);
                }
            }
            catch (err) {
                logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Error in dashboard simulation');
            }
        }, 2000); // Update every 2 seconds
    }
    generateMetrics() {
        return {
            network: {
                totalNodes: 1247 + Math.floor(Math.random() * 50),
                totalEdges: 2891 + Math.floor(Math.random() * 100),
                density: 0.37 + (Math.random() * 0.02 - 0.01),
                avgDegree: 4.6 + (Math.random() * 0.2 - 0.1),
                components: 3,
                clusters: 8 + Math.floor(Math.random() * 2),
            },
            investigations: {
                total: 24,
                active: 8 + Math.floor(Math.random() * 3),
                completed: 14,
                pending: 2,
                recentActivity: 15 + Math.floor(Math.random() * 5),
            },
            alerts: {
                high: 3 + Math.floor(Math.random() * 2),
                medium: 7 + Math.floor(Math.random() * 3),
                low: 12 + Math.floor(Math.random() * 5),
                total: 22, // Should recalculate sum but it's mock
            },
            activity: {
                dailyQueries: 127 + Math.floor(Math.random() * 10),
                weeklyAnalyses: 45,
                collaborators: 12 + Math.floor(Math.random() * 3),
                avgSessionTime: '2.3h',
            },
            system: {
                cpu: Math.floor(Math.random() * 60) + 20,
                memory: Math.floor(Math.random() * 40) + 30,
                latency: Math.floor(Math.random() * 100) + 20,
            }
        };
    }
    generateInsights() {
        return [
            {
                id: Date.now(),
                title: 'New Pattern Detected',
                description: 'Anomalous connection density in sub-graph A',
                confidence: 0.8 + Math.random() * 0.15,
                trend: Math.random() > 0.5 ? 'up' : 'down',
                category: 'network',
                actionable: true,
            }
        ];
    }
    generateActivity() {
        const types = ['analysis', 'anomaly', 'investigation', 'collaboration'];
        const type = types[Math.floor(Math.random() * types.length)];
        return {
            id: Date.now(),
            type,
            title: `New ${type} event`,
            description: `Detected new activity in sector ${Math.floor(Math.random() * 10)}`,
            timestamp: new Date(),
            user: 'System Bot',
            status: 'info',
            priority: Math.random() > 0.8 ? 'high' : 'medium',
        };
    }
    generateGraphUpdates() {
        // Simulate adding a node or edge
        return {
            type: Math.random() > 0.5 ? 'add_node' : 'add_edge',
            data: {
                id: `sim-${Date.now()}`,
                label: 'Simulated Entity'
            }
        };
    }
}
exports.dashboardSimulation = new DashboardSimulationService();
