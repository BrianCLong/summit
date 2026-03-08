"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const policyPath = node_path_1.default.join("policy", "graphrag", "policy.yaml");
const fixturesDir = node_path_1.default.join("policy", "graphrag", "fixtures");
function loadPolicy() {
    const raw = node_fs_1.default.readFileSync(policyPath, "utf8");
    return js_yaml_1.default.load(raw);
}
function evaluate(policy, fixture) {
    for (const rule of policy.rules) {
        if (rule.when.query_contains_any) {
            const hit = rule.when.query_contains_any.some((term) => fixture.query.toLowerCase().includes(term.toLowerCase()));
            if (hit) {
                return rule.action;
            }
        }
        if (rule.when.tenant_required && !fixture.tenant) {
            continue;
        }
        if (typeof rule.when.max_hops_lte === "number" &&
            fixture.maxHops > rule.when.max_hops_lte) {
            continue;
        }
        if (rule.when.tenant_required || rule.when.max_hops_lte !== undefined) {
            return rule.action;
        }
    }
    return policy.default;
}
describe("GraphRAG policy fixtures", () => {
    const policy = loadPolicy();
    it("denies fixtures missing tenant scope", () => {
        const fixture = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, "deny", "missing-tenant.json"), "utf8"));
        expect(evaluate(policy, fixture)).toBe("deny");
    });
    it("denies fixtures exceeding hop limits", () => {
        const fixture = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, "deny", "max-hops-too-high.json"), "utf8"));
        expect(evaluate(policy, fixture)).toBe("deny");
    });
    it("denies prompt injection fixtures", () => {
        const fixture = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, "deny", "prompt-injection.json"), "utf8"));
        expect(evaluate(policy, fixture)).toBe("deny");
    });
    it("allows tenant-scoped fixtures within hop limits", () => {
        const fixture = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, "allow", "tenant-scoped.json"), "utf8"));
        expect(evaluate(policy, fixture)).toBe("allow");
    });
});
