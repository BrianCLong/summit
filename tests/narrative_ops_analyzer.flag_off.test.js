"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
(0, node_test_1.test)('narrative ops analyzer is flagged off by default', (t) => {
    // Check manifest
    const manifestPath = 'subsumption/narrative-ops-detection-2026-01-28/manifest.yaml';
    const manifest = node_fs_1.default.readFileSync(manifestPath, 'utf8');
    // Simple regex check for the flag default
    const match = manifest.match(/name:\s*NARRATIVE_OPS_ANALYZER\s*\n\s*default:\s*0/);
    node_assert_1.default.ok(match, 'NARRATIVE_OPS_ANALYZER should be default 0 in manifest');
});
