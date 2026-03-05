import type { SkillName, SkillSpec } from "./types.js";

export class SkillRegistry {
  private readonly specs = new Map<SkillName, SkillSpec>();

  constructor(initial: SkillSpec[] = STARTER_SKILLS) {
    initial.forEach((skill) => this.register(skill));
  }

  register(spec: SkillSpec): void {
    this.specs.set(spec.name, { ...spec });
  }

  get(name: SkillName): SkillSpec | null {
    return this.specs.get(name) ?? null;
  }

  list(): SkillSpec[] {
    return [...this.specs.values()];
  }
}

export const STARTER_SKILLS: SkillSpec[] = [
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

export const defaultSkillRegistry = new SkillRegistry();
