"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSchema = loadSchema;
exports.loadTelemetry = loadTelemetry;
exports.loadChanges = loadChanges;
exports.loadFixtureDataset = loadFixtureDataset;
exports.normalizePaths = normalizePaths;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function loadJson(path) {
    const contents = (0, node_fs_1.readFileSync)(path, 'utf-8');
    return JSON.parse(contents);
}
function loadSchema(schemaPath) {
    return loadJson(schemaPath);
}
function loadTelemetry(telemetryPath) {
    return loadJson(telemetryPath);
}
function loadChanges(changesPath) {
    return loadJson(changesPath);
}
function loadFixtureDataset(fixturePath) {
    if (!fixturePath)
        return undefined;
    return loadJson(fixturePath);
}
function normalizePaths(config, baseDir) {
    return {
        ...config,
        schemaPath: (0, node_path_1.resolve)(baseDir, config.schemaPath),
        telemetryPath: (0, node_path_1.resolve)(baseDir, config.telemetryPath),
        changesPath: (0, node_path_1.resolve)(baseDir, config.changesPath),
        fixturePath: config.fixturePath ? (0, node_path_1.resolve)(baseDir, config.fixturePath) : undefined,
        outputPath: config.outputPath ? (0, node_path_1.resolve)(baseDir, config.outputPath) : undefined,
    };
}
