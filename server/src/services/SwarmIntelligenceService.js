"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwarmIntelligenceService = void 0;
const GossipProtocol_js_1 = require("../agents/swarm/GossipProtocol.js");
const ConsensusEngine_js_1 = require("../agents/swarm/ConsensusEngine.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const crypto_1 = require("crypto");
class SwarmIntelligenceService {
    static instance;
    gossip;
    consensus;
    nodeId;
    constructor() {
        this.nodeId = process.env.SWARM_NODE_ID || (0, crypto_1.randomUUID)();
        this.gossip = new GossipProtocol_js_1.GossipProtocol(this.nodeId);
        this.consensus = new ConsensusEngine_js_1.ConsensusEngine(this.nodeId, this.gossip);
    }
    static getInstance() {
        if (!SwarmIntelligenceService.instance) {
            SwarmIntelligenceService.instance = new SwarmIntelligenceService();
        }
        return SwarmIntelligenceService.instance;
    }
    async initialize() {
        try {
            await this.gossip.initialize();
            await this.consensus.initialize();
            logger_js_1.default.info(`SwarmIntelligenceService initialized with Node ID: ${this.nodeId}`);
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize SwarmIntelligenceService', error);
            throw error;
        }
    }
    async proposeAction(action, params) {
        logger_js_1.default.info(`Swarm proposing action: ${action}`);
        return this.consensus.propose(action, params);
    }
    async shutdown() {
        await this.gossip.shutdown();
    }
    getNodeId() {
        return this.nodeId;
    }
}
exports.SwarmIntelligenceService = SwarmIntelligenceService;
