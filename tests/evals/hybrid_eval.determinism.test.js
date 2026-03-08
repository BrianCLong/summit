"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const scriptPath = node_path_1.default.join("scripts", "evals", "hybrid_eval.mjs");
function runEval(outputDir) {
    (0, node_child_process_1.execFileSync)("node", [scriptPath], {
        env: { ...process.env, HYBRID_EVAL_OUTPUT_DIR: outputDir },
        stdio: "ignore",
    });
    return {
        report: node_fs_1.default.readFileSync(node_path_1.default.join(outputDir, "report.json"), "utf8"),
        metrics: node_fs_1.default.readFileSync(node_path_1.default.join(outputDir, "metrics.json"), "utf8"),
        stamp: node_fs_1.default.readFileSync(node_path_1.default.join(outputDir, "stamp.json"), "utf8"),
    };
}
describe("hybrid_eval.mjs determinism", () => {
    it("emits stable outputs across runs", () => {
        const dir1 = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "hybrid-eval-"));
        const dir2 = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "hybrid-eval-"));
        const first = runEval(dir1);
        const second = runEval(dir2);
        expect(first.report).toBe(second.report);
        expect(first.metrics).toBe(second.metrics);
        expect(first.stamp).toBe(second.stamp);
    });
});
