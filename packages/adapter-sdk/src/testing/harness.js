"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runContractTests = runContractTests;
const adapter_loader_js_1 = require("../adapter-loader.js");
const index_js_1 = require("./fixtures/index.js");
function validateResponseShape(response, issues) {
    if (!response || typeof response !== 'object') {
        issues.push('Adapter response must be an object.');
        return;
    }
    const typedResponse = response;
    if (typedResponse.status !== 'ok' && typedResponse.status !== 'error') {
        issues.push('Adapter response must include a status of "ok" or "error".');
    }
    if (typeof typedResponse.message !== 'string' || typedResponse.message.length === 0) {
        issues.push('Adapter response must include a non-empty message.');
    }
}
async function runContractTests(entry, event = index_js_1.basicEvent, context = index_js_1.basicContext) {
    const entryPath = await (0, adapter_loader_js_1.resolveEntry)(entry);
    const adapter = await (0, adapter_loader_js_1.loadAdapterModule)(entryPath);
    const issues = [];
    if (!adapter.metadata?.name) {
        issues.push('Adapter metadata must include a name.');
    }
    if (!adapter.metadata?.version) {
        issues.push('Adapter metadata must include a version.');
    }
    let response;
    try {
        response = await adapter.handleEvent(event, context);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(`handleEvent threw an error: ${message}`);
    }
    if (response) {
        validateResponseShape(response, issues);
    }
    return {
        passed: issues.length === 0,
        issues,
        response: response
    };
}
