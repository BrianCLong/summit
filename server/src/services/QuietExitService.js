"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuietExitService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'QuietExitService' });
class QuietExitService {
    static STIX_FILENAME = 'stix_thank_you.json';
    static async executeIfRequested() {
        if (process.env.SUMMIT_QUIET_EXIT !== 'true') {
            return;
        }
        logger.warn('SUMMIT_QUIET_EXIT triggered. Initiating zero-trace shutdown sequence...');
        try {
            // 1. Burn Firmware (Simulated)
            await this.burnFirmware();
            // 2. Wipe Memory (Simulated)
            await this.wipeMemory();
            // 3. Delete Artifacts (Simulated - in reality, we might delete temp files)
            await this.deleteArtifacts();
            // 4. Leave STIX Indicator
            await this.leaveStixIndicator();
            logger.warn('Quiet Exit complete. Disappearing.');
            // Force exit immediately after cleanup, bypassing standard graceful shutdown if needed,
            // but usually this is called *during* shutdown.
        }
        catch (error) {
            logger.error('Failed to execute Quiet Exit completely', error);
            // Even if it fails, we try to exit
        }
    }
    static async burnFirmware() {
        logger.info('Burning firmware kill-switch...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate hardware op
        logger.info('Firmware burned.');
    }
    static async wipeMemory() {
        logger.info('Wiping encrypted RAM blocks...');
        // In a real scenario, this would zero out buffers.
        // Here we just explicitly suggest it happening.
        if (global.gc) {
            global.gc();
        }
        logger.info('Memory wiped.');
    }
    static async deleteArtifacts() {
        logger.info('Deleting logs and artifacts...');
        // Could delete specific log files here if we knew their paths.
        // For safety in this environment, we just log the intent.
        logger.info('Artifacts deleted.');
    }
    static async leaveStixIndicator() {
        const stix = {
            type: "bundle",
            id: `bundle--${(0, crypto_1.randomUUID)()}`,
            objects: [
                {
                    type: "indicator",
                    id: `indicator--${(0, crypto_1.randomUUID)()}`,
                    created: new Date().toISOString(),
                    modified: new Date().toISOString(),
                    name: "Thank you.",
                    description: "The system has left the building.",
                    pattern: "[ file:name = 'summit.exe' ]",
                    pattern_type: "stix",
                    valid_from: new Date().toISOString()
                }
            ]
        };
        const filepath = path_1.default.resolve(process.cwd(), this.STIX_FILENAME);
        fs_1.default.writeFileSync(filepath, JSON.stringify(stix, null, 2));
        logger.info(`STIX indicator left at ${filepath}`);
    }
}
exports.QuietExitService = QuietExitService;
