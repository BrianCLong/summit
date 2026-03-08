"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
describe("expectation-baselines manifest", () => {
    it("parses and includes required keys", () => {
        const manifestPath = node_path_1.default.join("subsumption", "expectation-baselines", "manifest.yaml");
        const raw = node_fs_1.default.readFileSync(manifestPath, "utf8");
        const doc = js_yaml_1.default.load(raw);
        expect(doc.item).toBeDefined();
        expect(doc.item?.slug).toBe("expectation-baselines");
        expect(doc.item?.title).toBeDefined();
        expect(doc.item?.type).toBe("methodology");
        expect(doc.item?.date).toBeDefined();
        expect(Array.isArray(doc.claims)).toBe(true);
        expect(Array.isArray(doc.prs)).toBe(true);
        expect(Array.isArray(doc.gates)).toBe(true);
        expect(Array.isArray(doc.evidence_ids)).toBe(true);
        expect(Array.isArray(doc.docs_targets)).toBe(true);
        expect(Array.isArray(doc.feature_flags)).toBe(true);
        expect(doc.required_checks_discovery).toBeDefined();
        expect(doc.constraints).toBeDefined();
    });
});
