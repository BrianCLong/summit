"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const writer_js_1 = require("../../../src/graphrag/evidence/writer.js");
describe("writeEvidenceBundle", () => {
    const entries = [
        {
            report: {
                evidence_id: "EVD-cogops-feb2026-PROV-001",
                classification: "INTERNAL",
                summary: "provenance output",
            },
            metrics: { evidence_id: "EVD-cogops-feb2026-PROV-001", metrics: { records: 5 } },
            stamp: { evidence_id: "EVD-cogops-feb2026-PROV-001", generated_at: "2026-02-01T00:00:00Z" },
        },
        {
            report: {
                evidence_id: "EVD-cogops-feb2026-MODEL-001",
                classification: "INTERNAL",
                summary: "model output",
            },
            metrics: { evidence_id: "EVD-cogops-feb2026-MODEL-001", metrics: { entities: 3 } },
            stamp: { evidence_id: "EVD-cogops-feb2026-MODEL-001", generated_at: "2026-02-01T00:00:00Z" },
        },
    ];
    it("writes lexicographically sorted index entries", async () => {
        const tmpDir = await (0, promises_1.mkdtemp)(node_path_1.default.join(node_os_1.default.tmpdir(), "evidence-"));
        try {
            await (0, writer_js_1.writeEvidenceBundle)(entries, { baseDir: tmpDir });
            const indexRaw = await (0, promises_1.readFile)(node_path_1.default.join(tmpDir, "index.json"), "utf8");
            const index = JSON.parse(indexRaw);
            expect(index.items.map((item) => item.evidence_id)).toEqual([
                "EVD-cogops-feb2026-MODEL-001",
                "EVD-cogops-feb2026-PROV-001",
            ]);
        }
        finally {
            await (0, promises_1.rm)(tmpDir, { recursive: true, force: true });
        }
    });
    it("keeps timestamps confined to stamp.json content", async () => {
        const tmpDir = await (0, promises_1.mkdtemp)(node_path_1.default.join(node_os_1.default.tmpdir(), "evidence-"));
        try {
            await (0, writer_js_1.writeEvidenceBundle)(entries, { baseDir: tmpDir });
            const reportRaw = await (0, promises_1.readFile)(node_path_1.default.join(tmpDir, "EVD-cogops-feb2026-MODEL-001", "report.json"), "utf8");
            const metricsRaw = await (0, promises_1.readFile)(node_path_1.default.join(tmpDir, "EVD-cogops-feb2026-MODEL-001", "metrics.json"), "utf8");
            expect(reportRaw.includes("generated_at")).toBe(false);
            expect(metricsRaw.includes("generated_at")).toBe(false);
        }
        finally {
            await (0, promises_1.rm)(tmpDir, { recursive: true, force: true });
        }
    });
});
