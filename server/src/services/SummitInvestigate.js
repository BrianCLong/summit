"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitInvestigate = void 0;
const summit_investigate_js_1 = __importDefault(require("../routes/summit-investigate.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * SummitInvestigate - The Advanced OSINT Platform Integration Layer
 *
 * This class serves as the central entry point for the "SummitInvestigate" capabilities.
 * It registers the necessary routes and ensures all services are initialized.
 */
class SummitInvestigate {
    static initialize(app) {
        logger_js_1.default.info('[SummitInvestigate] Initializing platform modules...');
        // Mount the routes under a dedicated API namespace
        app.use('/api/summit-investigate', summit_investigate_js_1.default);
        logger_js_1.default.info('[SummitInvestigate] Modules loaded: VerificationSwarm, EvidenceFusion, DeepfakeHunter, PredictiveSimulator, CollaborationHub');
        logger_js_1.default.info('[SummitInvestigate] Platform ready.');
    }
}
exports.SummitInvestigate = SummitInvestigate;
