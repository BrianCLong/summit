"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const path_1 = __importDefault(require("path"));
const dataPlatformHarness_js_1 = require("../helpers/dataPlatformHarness.js");
(0, globals_1.describe)('Data & Knowledge Platform golden path', () => {
    (0, globals_1.it)('ingests, retrieves, and answers with cited evidence', async () => {
        const harness = (0, dataPlatformHarness_js_1.createDataPlatformHarness)();
        const fixturePath = path_1.default.join('fixtures', 'data-platform', 'golden-brief.md');
        const fixtureText = await (0, dataPlatformHarness_js_1.loadFixtureText)(fixturePath);
        const { chunks } = await harness.ingestDocument('golden-doc', fixtureText);
        (0, globals_1.expect)(chunks).toHaveLength(3);
        const persisted = await harness.chunkStore.listChunks('golden-doc');
        (0, globals_1.expect)(persisted.map((chunk) => chunk.id).sort()).toEqual(chunks.map((chunk) => chunk.id).sort());
        const powerChunk = chunks.find((chunk) => chunk.text.toLowerCase().includes('solar power'));
        (0, globals_1.expect)(powerChunk).toBeDefined();
        const retrieval = await harness.retrieve('How is the sensor network kept powered in the field?', 2);
        (0, globals_1.expect)(retrieval.matches.length).toBeGreaterThan(0);
        (0, globals_1.expect)(retrieval.chunkIds).toContain(powerChunk.id);
        (0, globals_1.expect)(retrieval.matches[0]?.chunkId).toBe(powerChunk.id);
        const rag = await harness.ragAnswer('How is the sensor network kept powered in the field?', retrieval);
        (0, globals_1.expect)(rag.citations.map((cite) => cite.chunkId)).toEqual(globals_1.expect.arrayContaining(retrieval.chunkIds));
        (0, globals_1.expect)(rag.citations.length).toBe(retrieval.matches.length);
        (0, globals_1.expect)(rag.answer).toContain(`[${powerChunk.id}]`);
    });
});
