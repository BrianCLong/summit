"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const registry_js_1 = require("../../summit/agents/skills/registry.js");
(0, node_test_1.default)("SkillRegistry loads starter skills and supports lookup/list/register", () => {
    const registry = new registry_js_1.SkillRegistry();
    strict_1.default.equal(registry.get("repo.read")?.name, "repo.read");
    strict_1.default.ok(registry.list().length >= 6);
    registry.register({
        name: "custom.audit",
        description: "Audit custom path",
        risk: "medium",
        scopes: ["repo"],
    });
    strict_1.default.match(registry.get("custom.audit")?.description ?? "", /Audit custom path/);
});
