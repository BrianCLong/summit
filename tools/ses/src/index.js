#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const chalk_1 = __importDefault(require("chalk"));
const loader_js_1 = require("./loader.js");
const simulator_js_1 = require("./simulator.js");
function printUsage() {
    console.log(`Schema Evolution Simulator (SES)\nUsage: ses <config.json>`);
}
function readConfig(path) {
    try {
        const raw = loadConfigFile(path);
        return (0, loader_js_1.normalizePaths)(raw, (0, node_path_1.dirname)(path));
    }
    catch (error) {
        throw new Error(`Failed to read configuration ${path}: ${error.message}`);
    }
}
function loadConfigFile(path) {
    const raw = (0, node_fs_1.readFileSync)(path, 'utf-8');
    return JSON.parse(raw);
}
function ensureOutputPath(path) {
    const folder = (0, node_path_1.dirname)(path);
    if (!(0, node_fs_1.existsSync)(folder)) {
        (0, node_fs_1.mkdirSync)(folder, { recursive: true });
    }
}
function run() {
    const [, , configPath] = process.argv;
    if (!configPath) {
        printUsage();
        process.exit(1);
    }
    const absoluteConfig = (0, node_path_1.resolve)(process.cwd(), configPath);
    const config = readConfig(absoluteConfig);
    const schema = (0, loader_js_1.loadSchema)(config.schemaPath);
    const telemetry = (0, loader_js_1.loadTelemetry)(config.telemetryPath);
    const changes = (0, loader_js_1.loadChanges)(config.changesPath);
    const fixture = (0, loader_js_1.loadFixtureDataset)(config.fixturePath);
    const result = (0, simulator_js_1.runSimulation)({ schema, telemetry, changes, fixture });
    if (config.outputPath) {
        ensureOutputPath(config.outputPath);
        (0, node_fs_1.writeFileSync)(config.outputPath, JSON.stringify(result, null, 2));
        console.log(chalk_1.default.green(`Simulation results written to ${config.outputPath}`));
    }
    else {
        console.log(JSON.stringify(result, null, 2));
    }
}
run();
