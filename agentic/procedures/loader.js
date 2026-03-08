"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadProcedureFromFile = loadProcedureFromFile;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
async function loadProcedureFromFile(path) {
    const procedurePath = (0, node_path_1.resolve)(path);
    const contents = await (0, promises_1.readFile)(procedurePath, 'utf8');
    return (0, yaml_1.parse)(contents);
}
