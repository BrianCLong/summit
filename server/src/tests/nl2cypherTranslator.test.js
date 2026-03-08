"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const index_js_1 = require("../nl2cypher/index.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('nl2cypher corpus', () => {
    (0, globals_1.it)('produces expected cypher and AST for corpus', () => {
        const currentDir = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
        const corpusPath = (0, node_path_1.join)(currentDir, '../../../contracts/nl2cypher/prompts.tsv');
        const lines = (0, node_fs_1.readFileSync)(corpusPath, 'utf-8').trim().split('\n');
        let success = 0;
        for (const line of lines) {
            const [promptPart, astJsonPart, cypherPart] = line.split('\t');
            const prompt = promptPart.trim();
            const astExpected = JSON.parse(astJsonPart.trim());
            const cypherExpected = cypherPart.trim();
            const result = (0, index_js_1.nl2cypher)(prompt);
            (0, globals_1.expect)(result.cypher.trim()).toBe(cypherExpected);
            (0, globals_1.expect)(result.ast).toEqual(astExpected);
            success++;
        }
        (0, globals_1.expect)(success / lines.length).toBeGreaterThanOrEqual(0.95);
    });
});
