"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSkillRegistry = exports.STARTER_SKILLS = exports.SkillRegistry = void 0;
class SkillRegistry {
    specs = new Map();
    constructor(initial = exports.STARTER_SKILLS) {
        initial.forEach((skill) => this.register(skill));
    }
    register(spec) {
        this.specs.set(spec.name, { ...spec });
    }
    get(name) {
        return this.specs.get(name) ?? null;
    }
    list() {
        return [...this.specs.values()];
    }
}
exports.SkillRegistry = SkillRegistry;
exports.STARTER_SKILLS = [
    {
        name: "plan.generate",
        description: "Generate execution plans for assigned tasks.",
        risk: "low",
        scopes: ["compute"],
    },
    {
        name: "repo.read",
        description: "Read repository files for analysis and context.",
        risk: "low",
        scopes: ["repo", "fs"],
    },
    {
        name: "repo.write",
        description: "Write repository files and stage implementation changes.",
        risk: "high",
        scopes: ["repo", "fs"],
    },
    {
        name: "tests.run",
        description: "Execute test suites and validation checks.",
        risk: "medium",
        scopes: ["compute"],
    },
    {
        name: "ci.inspect",
        description: "Inspect CI artifacts and pipeline status.",
        risk: "low",
        scopes: ["compute"],
    },
    {
        name: "release.approve",
        description: "Approve release progression under governance control.",
        risk: "high",
        scopes: ["repo", "compute"],
    },
];
exports.defaultSkillRegistry = new SkillRegistry();
