"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEntities = resolveEntities;
const path_1 = __importDefault(require("path"));
const python_shell_1 = require("python-shell");
const pino_1 = __importDefault(require("pino"));
const node_crypto_1 = require("node:crypto");
const log = pino_1.default({ name: 'HybridEntityResolutionService' });
async function resolveEntities(a, b) {
    const traceId = (0, node_crypto_1.randomUUID)();
    const script = path_1.default.join(process.cwd(), 'ml', 'er', 'api.py');
    const result = await python_shell_1.PythonShell.run(script, {
        args: [a, b],
        pythonOptions: ['-u'],
    });
    const parsed = JSON.parse(result[0]);
    log.info({ traceId, features: parsed.explanation }, 'er_match');
    return { ...parsed, traceId };
}
