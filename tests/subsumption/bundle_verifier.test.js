"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
describe("subsumption bundle verifier", () => {
    it("fails when manifest is missing", () => {
        const result = (0, node_child_process_1.spawnSync)("node", ["scripts/ci/verify_subsumption_bundle.mjs"], {
            env: {
                ...process.env,
                SUBSUMPTION_MANIFEST_PATH: node_path_1.default.join("subsumption", "missing.yaml"),
            },
        });
        expect(result.status).toBe(1);
        expect(result.stderr.toString()).toContain("missing manifest");
    });
});
