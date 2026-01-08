import { Reviewer } from "../src/reviewer";
import { scanForSecrets } from "../src/secret-scanner";

describe("Secret Scanner", () => {
  it("detects AWS keys", () => {
    const finding = scanForSecrets(
      'aws_secret_key = "abcd1234abcd1234abcd1234abcd1234abcd1234"',
      "config.ts",
      10
    );
    expect(finding).toBeTruthy();
    expect(finding?.ruleId).toBe("secret-aws-secret-key");
  });

  it("detects Private Keys", () => {
    const finding = scanForSecrets("-----BEGIN PRIVATE KEY-----", "key.pem", 1);
    expect(finding).toBeTruthy();
    expect(finding?.ruleId).toBe("secret-private-key");
  });

  it("ignores safe content", () => {
    const finding = scanForSecrets('const myVar = "hello world";', "app.ts", 1);
    expect(finding).toBeNull();
  });
});

describe("Reviewer", () => {
  it("flags risky files", () => {
    const mockDiff = [
      {
        to: "src/security/AuthService.ts",
        chunks: [
          {
            content: "...",
            changes: [{ type: "add", content: "new code", ln2: 10 } as any],
          },
        ],
      },
    ];
    const reviewer = new Reviewer(mockDiff as any);
    const findings = reviewer.review();
    expect(findings.some((f) => f.ruleId === "risky-file-modified")).toBe(true);
  });

  it("flags missing tests", () => {
    const mockDiff = [
      {
        to: "src/logic.ts",
        chunks: [
          {
            content: "...",
            changes: [{ type: "add", content: "function foo() {}", ln2: 5 } as any],
          },
        ],
      },
    ];
    const reviewer = new Reviewer(mockDiff as any);
    const findings = reviewer.review();
    expect(findings.some((f) => f.ruleId === "missing-tests")).toBe(true);
  });

  it("flags empty catch", () => {
    const mockDiff = [
      {
        to: "src/api.ts",
        chunks: [
          {
            content: "...",
            changes: [{ type: "add", content: "catch (e) {}", ln2: 20 } as any],
          },
        ],
      },
    ];
    const reviewer = new Reviewer(mockDiff as any);
    const findings = reviewer.review();
    expect(findings.some((f) => f.ruleId === "empty-catch")).toBe(true);
  });

  it("flags unpaginated list", () => {
    const mockDiff = [
      {
        to: "src/db.ts",
        chunks: [
          {
            content: "...",
            changes: [
              { type: "add", content: "const users = db.users.findAll();", ln2: 30 } as any,
            ],
          },
        ],
      },
    ];
    const reviewer = new Reviewer(mockDiff as any);
    const findings = reviewer.review();
    expect(findings.some((f) => f.ruleId === "missing-pagination")).toBe(true);
  });
});
