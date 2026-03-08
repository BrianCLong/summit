"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, node_path_1.dirname)(__filename);
function hasPlaceholders(content) {
    return /<<[^>]+>>/.test(content) || /TODO/i.test(content) || /CHANGEME/i.test(content);
}
(0, vitest_1.describe)('prompt integrity', () => {
    (0, vitest_1.it)('ensures prompt templates are present and free from placeholders', () => {
        const promptDir = (0, node_path_1.join)(__dirname, '..', 'src', 'prompt');
        const files = (0, node_fs_1.readdirSync)(promptDir).filter((file) => file.endsWith('.ts'));
        const violations = [];
        for (const file of files) {
            const content = (0, node_fs_1.readFileSync)((0, node_path_1.join)(promptDir, file), 'utf-8');
            if (content.trim().length === 0) {
                violations.push(`${file}: empty content`);
            }
            if (hasPlaceholders(content)) {
                violations.push(`${file}: contains placeholder tokens`);
            }
        }
        (0, vitest_1.expect)(violations).toEqual([]);
    });
});
