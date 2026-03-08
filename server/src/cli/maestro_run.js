#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_js_1 = require("../maestro/core.js");
const client_js_1 = require("../intelgraph/client.js");
const cost_meter_js_1 = require("../maestro/cost_meter.js");
const llm_openai_js_1 = require("../maestro/adapters/llm_openai.js");
async function main() {
    const [, , ...args] = process.argv;
    const requestText = args.join(' ').trim();
    if (!requestText) {
        console.error('Usage: maestro-run "<request text>"');
        process.exit(1);
    }
    // Define a simple pricing table
    const pricingTable = {
        'openai:gpt-4.1': { inputPer1K: 0.03, outputPer1K: 0.06 },
        'openai:gpt-4.1-mini': { inputPer1K: 0.01, outputPer1K: 0.02 },
    };
    const ig = new client_js_1.IntelGraphClientImpl();
    const costMeter = new cost_meter_js_1.CostMeter(ig, pricingTable);
    const llm = new llm_openai_js_1.OpenAILLM(process.env.OPENAI_API_KEY || 'dummy-key', costMeter);
    const maestro = new core_js_1.Maestro(ig, costMeter, llm, {
        defaultPlannerAgent: 'openai:gpt-4.1',
        defaultActionAgent: 'openai:gpt-4.1-mini',
    });
    const result = await maestro.runPipeline('local-user', requestText);
    console.log(JSON.stringify(result, null, 2));
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
