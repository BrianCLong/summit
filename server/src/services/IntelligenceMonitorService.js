"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelligenceMonitor = void 0;
const socket_js_1 = require("../realtime/socket.js");
const pino_1 = __importDefault(require("pino"));
const crypto_1 = require("crypto");
const logger = pino_1.default();
class IntelligenceMonitorService {
    static instance;
    activeTargets = new Map();
    simulationInterval = null;
    isRunning = false;
    constructor() { }
    static getInstance() {
        if (!IntelligenceMonitorService.instance) {
            IntelligenceMonitorService.instance = new IntelligenceMonitorService();
        }
        return IntelligenceMonitorService.instance;
    }
    startMonitoring(targetId) {
        const currentCount = this.activeTargets.get(targetId) || 0;
        this.activeTargets.set(targetId, currentCount + 1);
        logger.info(`Started intelligence monitoring for target: ${targetId}. Subscribers: ${currentCount + 1}`);
        if (!this.isRunning) {
            this.startSimulation();
        }
    }
    stopMonitoring(targetId) {
        const currentCount = this.activeTargets.get(targetId) || 0;
        if (currentCount <= 1) {
            this.activeTargets.delete(targetId);
            logger.info(`Stopped intelligence monitoring for target: ${targetId}. No more subscribers.`);
        }
        else {
            this.activeTargets.set(targetId, currentCount - 1);
            logger.info(`Decremented subscribers for target: ${targetId}. Remaining: ${currentCount - 1}`);
        }
        if (this.activeTargets.size === 0) {
            this.stopSimulation();
        }
    }
    startSimulation() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        logger.info('Starting intelligence simulation loop');
        this.simulationInterval = setInterval(() => {
            this.generateSimulatedData();
        }, 2000); // Generate data every 2 seconds
    }
    stopSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        this.isRunning = false;
        logger.info('Stopped intelligence simulation loop');
    }
    generateSimulatedData() {
        const io = (0, socket_js_1.getIO)();
        if (!io)
            return;
        if (this.activeTargets.size === 0)
            return;
        // Pick a random target
        const targets = Array.from(this.activeTargets.keys());
        const targetId = targets[Math.floor(Math.random() * targets.length)];
        // Generate Item
        const item = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: Date.now(),
            source: this.getRandomSource(),
            type: this.getRandomType(),
            content: this.getRandomContent(),
            metadata: {},
            threatScore: Math.random(),
            targetId,
        };
        // Emit item to specific target room
        io.of('/realtime').to(`intelligence:${targetId}`).emit('intelligence:item', item);
        // Also emit to a global feed if needed
        io.of('/realtime').to('intelligence:global').emit('intelligence:item', item);
        // Randomly generate alert
        if (item.threatScore > 0.8) {
            const alert = {
                id: (0, crypto_1.randomUUID)(),
                timestamp: Date.now(),
                severity: item.threatScore > 0.95 ? 'critical' : 'high',
                title: `High Threat Detected from ${item.source}`,
                description: `High threat score (${item.threatScore.toFixed(2)}) detected in ${item.type} feed containing keywords.`,
                items: [item.id],
                status: 'active',
            };
            io.of('/realtime').to(`intelligence:${targetId}`).emit('intelligence:alert', alert);
            io.of('/realtime').to('intelligence:global').emit('intelligence:alert', alert);
        }
    }
    getRandomSource() {
        const sources = ['Twitter', 'Reddit', 'Telegram', 'DarkNet Forum', 'NewsAPI', 'Signal'];
        return sources[Math.floor(Math.random() * sources.length)];
    }
    getRandomType() {
        const types = ['social', 'darkweb', 'news', 'signal'];
        return types[Math.floor(Math.random() * types.length)];
    }
    getRandomContent() {
        const templates = [
            "Mention of target in compromised database leak.",
            "Suspicious activity detected near operational zone.",
            "Negative sentiment spike observed in social channels.",
            "New domain registered resembling target infrastructure.",
            "Credential dump released containing potential matches.",
            "Coordinated inauthentic behavior signatures detected.",
            "Unusual traffic patterns from high-risk geolocations.",
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
}
exports.intelligenceMonitor = IntelligenceMonitorService.getInstance();
