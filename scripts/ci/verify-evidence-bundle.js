"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const _2020_js_1 = __importDefault(require("ajv/dist/2020.js"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const writer_js_1 = require("../../src/graphrag/evidence/writer.js");
async function loadJson(relativePath) {
    const raw = await (0, promises_1.readFile)(node_path_1.default.join(process.cwd(), relativePath), "utf8");
    return JSON.parse(raw);
}
async function validateFixtures() {
    const ajv = new _2020_js_1.default({ allErrors: true, strict: false });
    (0, ajv_formats_1.default)(ajv);
    const files = ["index", "report", "metrics", "stamp"];
    for (const file of files) {
        const schema = await loadJson(`docs/api/schemas/evidence/${file}.schema.json`);
        const positive = await loadJson(`tests/fixtures/evidence/positive/${file}.json`);
        const negative = await loadJson(`tests/fixtures/evidence/negative/${file}.json`);
        const validate = ajv.compile(schema);
        if (!validate(positive)) {
            throw new Error(`Positive fixture failed schema ${file}`);
        }
        if (validate(negative)) {
            throw new Error(`Negative fixture unexpectedly passed schema ${file}`);
        }
    }
}
async function validateDeterminism() {
    const entries = [
        {
            report: {
                evidence_id: "EVD-cogops-feb2026-CIB-001",
                classification: "INTERNAL",
                summary: "coordination feature report",
            },
            metrics: { evidence_id: "EVD-cogops-feb2026-CIB-001", metrics: { burstiness: 0.77 } },
            stamp: { evidence_id: "EVD-cogops-feb2026-CIB-001", generated_at: "2026-02-01T00:00:00Z" },
        },
    ];
    const dir1 = await (0, promises_1.mkdtemp)(node_path_1.default.join(node_os_1.default.tmpdir(), "evidence-a-"));
    const dir2 = await (0, promises_1.mkdtemp)(node_path_1.default.join(node_os_1.default.tmpdir(), "evidence-b-"));
    try {
        await (0, writer_js_1.writeEvidenceBundle)(entries, { baseDir: dir1 });
        await (0, writer_js_1.writeEvidenceBundle)(entries, { baseDir: dir2 });
        const files = [
            "index.json",
            "EVD-cogops-feb2026-CIB-001/report.json",
            "EVD-cogops-feb2026-CIB-001/metrics.json",
        ];
        for (const file of files) {
            const one = await (0, promises_1.readFile)(node_path_1.default.join(dir1, file), "utf8");
            const two = await (0, promises_1.readFile)(node_path_1.default.join(dir2, file), "utf8");
            if (one !== two) {
                throw new Error(`Non-deterministic output detected for ${file}`);
            }
        }
    }
    finally {
        await (0, promises_1.rm)(dir1, { recursive: true, force: true });
        await (0, promises_1.rm)(dir2, { recursive: true, force: true });
    }
}
async function main() {
    await validateFixtures();
    await validateDeterminism();
    process.stdout.write("evidence verification passed\n");
}
void main();
