"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmokeTester = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class SmokeTester {
    targetUrl;
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
    }
    async run() {
        console.log(`[SmokeTest] Targeting ${this.targetUrl}`);
        try {
            // Check Basic Health
            if (!await this.checkEndpoint('/health'))
                return false;
            // Check Detailed Health (Dependencies)
            if (!await this.checkEndpoint('/health/detailed'))
                return false;
            // Check Readiness
            if (!await this.checkEndpoint('/health/ready'))
                return false;
            console.log(`[SmokeTest] All smoke tests passed.`);
            return true;
        }
        catch (error) {
            console.error(`[SmokeTest] Unexpected error during smoke test:`, error);
            return false;
        }
    }
    async checkEndpoint(path) {
        const url = `${this.targetUrl}${path}`;
        try {
            const start = Date.now();
            const res = await (0, node_fetch_1.default)(url);
            const duration = Date.now() - start;
            if (res.ok) {
                console.log(`[SmokeTest] ✅ ${path} - ${res.status} (${duration}ms)`);
                return true;
            }
            else {
                console.error(`[SmokeTest] ❌ ${path} - ${res.status} (${duration}ms)`);
                return false;
            }
        }
        catch (error) {
            console.error(`[SmokeTest] ❌ ${path} - Connection Failed`);
            return false;
        }
    }
}
exports.SmokeTester = SmokeTester;
