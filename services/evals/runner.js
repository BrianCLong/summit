"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEval = runEval;
const fs_1 = __importDefault(require("fs"));
async function runEval(id) {
    const def = parseYaml(fs_1.default.readFileSync(`evals/${id}.yaml`, 'utf8'));
    // 1) apply patch, 2) run tests, 3) compute risk, 4) structured checks
    const s = 0.91; // mocked score
    await fs_1.default.promises.writeFile(`artifacts/evals/${id}.json`, JSON.stringify({ score: s }, null, 2));
    return s;
}
