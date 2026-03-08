"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const runner_js_1 = require("../runner.js");
const ai_grounding_js_1 = require("./ai_grounding.js");
async function main() {
    await (0, runner_js_1.runGate)('ai-upgrade-grounding', async () => {
        let recs = [];
        // In a real flow, this would come from an AI agent's output artifact
        const recsFile = process.env.AI_RECS_FILE || 'ai-recommendations.json';
        if (fs_1.default.existsSync(recsFile)) {
            console.log(`Loading recommendations from ${recsFile}`);
            try {
                recs = JSON.parse(fs_1.default.readFileSync(recsFile, 'utf-8'));
            }
            catch (e) {
                console.error('Failed to parse recommendations file');
                return { ok: false, findings: ['Invalid JSON in recommendations file'] };
            }
        }
        else {
            console.log('No recommendations file found, skipping grounding check (pass).');
        }
        // For testing purposes
        if (process.env.TEST_FAIL_AI_GATE) {
            recs.push({ name: 'this-package-does-not-exist-at-all-12345', version: '9.9.9', ecosystem: 'npm' });
        }
        return (0, ai_grounding_js_1.evaluateAIGrounding)(recs);
    });
}
main();
