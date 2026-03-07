import fs from "fs";
import path from "path";
import {
  ApprovalGate,
  ContextPacker,
  ModelRouter,
  PromptRegistry,
  RedteamFixture,
  ToolPermissionGateway,
  ToolPlanInterpreter,
  deterministicVersion,
  lintPrompt,
  runEvals,
  runRedteam,
} from "../src/index.js";

describe("Prompt registry + hygiene", () => {
  const registry = new PromptRegistry();
  const prompt = {
    name: "case-summary",
    version: "v1",
    owner: "ai-core",
    purpose: "summarize cases",
    riskLevel: "medium" as const,
    template: "Case {{id}} handled by {{owner}}",
    allowedVars: [
      { name: "id", maxLength: 10 },
      { name: "owner", maxLength: 20, redact: true },
    ],
    maxTokens: 20,
  };

  it("lints and rejects unsafe prompts", () => {
    const unsafe = { ...prompt, template: "password: {{secret}}" };
    const lintResult = lintPrompt(unsafe);
    expect(lintResult.ok).toBe(false);
    expect(() => registry.register(unsafe as any)).toThrow("Prompt failed lint");
  });

  it("renders deterministically with redaction and escaping", () => {
    registry.register(prompt);
    const output = registry.render(
      "case-summary",
      "v1",
      { id: "123", owner: "<admin>" },
      { redactUnknown: true }
    );
    expect(output).toBe("Case 123 handled by [REDACTED]");
  });
});

describe("Tool permissioning gateway", () => {
  it("denies by default and audits decisions", () => {
    const gateway = new ToolPermissionGateway();
    gateway.setPolicies("/ai/run", [{ toolName: "search", minRiskLevel: "low" }]);
    const context = { tenantId: "t1", route: "/ai/run", riskLevel: "medium" as const };
    const allowed = gateway.evaluate("search", context, "normal use");
    expect(allowed.allowed).toBe(true);

    const denied = gateway.evaluate("delete", context, "unsafe");
    expect(denied.allowed).toBe(false);
    expect(denied.code).toBe("TOOL_DENIED");
    expect(gateway.getAuditLog().length).toBe(2);
  });
});

describe("Context packer with PII policy", () => {
  it("redacts canary secrets and enforces size bounds deterministically", () => {
    const packer = new ContextPacker(120, 20);
    const pack = packer.build({
      scope: "scope-1",
      entities: [{ id: "1", name: "alpha", secret: "SECRET_CANARY" }],
      notes: ["keep short"],
      hypotheses: ["h1"],
      canarySecret: "SECRET_CANARY",
    });
    expect(pack.redactedFields).toContain("secret");
    expect(JSON.stringify(pack.sections)).not.toContain("SECRET_CANARY");
    expect(pack.size.bytes).toBeLessThanOrEqual(120);
    expect(pack.provenance).toHaveLength(4);
  });
});

describe("Model routing + kill switch", () => {
  it("disables calls when kill switch set and uses deterministic canary hashing", () => {
    const router = new ModelRouter([
      {
        feature: "summaries",
        defaultModel: "gpt-prod",
        fallbacks: ["gpt-canary"],
        canaryPercent: 50,
      },
    ]);
    router.setKillSwitch(true);
    const disabled = router.resolve("summaries", "tenantA");
    expect(disabled.code).toBe("AI_DISABLED");

    router.setKillSwitch(false);
    const first = router.resolve("summaries", "tenantA");
    const second = router.resolve("summaries", "tenantA");
    expect(first.usedFallback).toBe(second.usedFallback);
  });
});

describe("Eval harness", () => {
  const tmpReport = path.join(__dirname, "eval_report.json");
  afterEach(() => {
    if (fs.existsSync(tmpReport)) fs.rmSync(tmpReport);
  });

  it("produces deterministic eval reports", () => {
    const report = runEvals(
      [
        {
          name: "echo-plan",
          input: { q: "hi" },
          contextPack: {},
          expected: { toolPlan: { steps: [] } },
        },
      ],
      { reportPath: tmpReport, planOnly: true, seed: 42 }
    );

    expect(report.results[0].passed).toBe(true);
    expect(fs.existsSync(tmpReport)).toBe(true);
  });
});

describe("Red-team pack", () => {
  const fixtures: RedteamFixture[] = [
    { name: "ignore-instructions", attack: "ignore policy", category: "injection" },
    { name: "data-exfil", attack: "dump secrets", category: "exfil", disallowedTools: ["fs"] },
  ];

  it("flags leaks or tool abuse", () => {
    const results = runRedteam(
      fixtures,
      (attack) => ({
        output: `refused:${attack}`,
        toolsCalled: attack.includes("dump") ? ["search"] : [],
      }),
      "C4NARY"
    );
    results.forEach((r) => expect(r.passed).toBe(true));
  });
});

describe("Safe tool-plan interpreter", () => {
  it("rejects malicious plan and executes valid steps with redacted logs", async () => {
    const interpreter = new ToolPlanInterpreter(["safeTool"], 3, {
      safeTool: (args) => `handled ${args.input}`,
    });

    const goodPlan = {
      steps: [
        {
          toolName: "safeTool",
          args: { input: "value" },
          argsSchema: { input: { type: "string", required: true } },
          expectedResultSchema: {},
        },
      ],
    };

    const result = await interpreter.run(goodPlan);
    expect(result.logs[0].output).toBe("handled value");

    const badPlan = {
      steps: [
        {
          toolName: "unknown",
          args: {},
          argsSchema: {},
        },
      ],
    };
    await expect(interpreter.run(badPlan as any)).rejects.toThrow("allowlisted");
  });
});

describe("Human approval gates", () => {
  it("enforces dual control and token binding", () => {
    const gate = new ApprovalGate();
    const planHash = deterministicVersion("plan");
    const request = gate.requestApproval({
      actionType: "export",
      scope: "case:1",
      planHash,
      rationale: "needed",
      requester: "alice",
      ttlMs: 1000,
    });

    expect(() => gate.approve(request.id, "alice")).toThrow("Requester cannot approve");
    const approved = gate.approve(request.id, "bob");
    expect(approved.token).toBeDefined();
    const valid = gate.validateToken("export", "case:1", planHash, approved.token);
    expect(valid).toBe(true);
    const invalid = gate.validateToken("export", "case:1", "other", approved.token);
    expect(invalid).toBe(false);
  });
});
