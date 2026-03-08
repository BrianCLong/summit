"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalCollectionService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class SignalCollectionService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SignalCollectionService.instance) {
            SignalCollectionService.instance = new SignalCollectionService();
        }
        return SignalCollectionService.instance;
    }
    /**
     * Ingests a raw signal buffer (simulated) and normalizes it into a Signal object.
     */
    ingestSignal(rawInput) {
        // Input validation and normalization logic
        return {
            id: rawInput.id || node_crypto_1.default.randomUUID(),
            emitterId: rawInput.emitterId, // Allow forcing emitterId for simulation
            timestamp: new Date(),
            frequency: rawInput.frequency || 100e6, // Default 100MHz
            bandwidth: rawInput.bandwidth || 25e3,
            power: rawInput.power || -70,
            snr: rawInput.snr || 20,
            duration: rawInput.duration || 1000,
            data: rawInput.data, // Buffer
            metadata: rawInput.metadata || {}
        };
    }
}
exports.SignalCollectionService = SignalCollectionService;
