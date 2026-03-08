"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncToolkit = syncToolkit;
const fs_1 = require("fs");
const path_1 = require("path");
const chalk_1 = __importDefault(require("chalk"));
const index_js_1 = require("../../src/toolkit/index.js");
async function syncToolkit(source, outPath) {
    if (source.toLowerCase() !== 'bellingcat') {
        throw new Error(`Unsupported toolkit source: ${source}`);
    }
    console.log(chalk_1.default.blue(`Syncing toolkit from source: ${source}...`));
    const importer = new index_js_1.BellingcatImporter();
    const rawData = await importer.fetchRawData();
    const tools = importer.parseCSV(rawData);
    console.log(chalk_1.default.green(`Successfully parsed ${tools.length} tools.`));
    const registry = (0, index_js_1.createNormalizedRegistry)(source, tools);
    // Ensure output directory exists
    (0, fs_1.mkdirSync)((0, path_1.dirname)(outPath), { recursive: true });
    (0, fs_1.writeFileSync)(outPath, JSON.stringify(registry, null, 2), 'utf-8');
    console.log(chalk_1.default.green(`Successfully wrote deterministic toolkit to: ${outPath}`));
    console.log(chalk_1.default.green(`Total tools synced: ${registry.count}`));
}
