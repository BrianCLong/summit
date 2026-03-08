"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicyFromFile = loadPolicyFromFile;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
async function loadPolicyFromFile(path) {
    const policyPath = (0, node_path_1.resolve)(path);
    const contents = await (0, promises_1.readFile)(policyPath, 'utf8');
    return (0, yaml_1.parse)(contents);
}
