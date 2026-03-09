export type PolicyStatus = "pass" | "fail" | "warn";

export type PolicyResult = {
  policy_name: string;
  status: PolicyStatus;
  severity: "low" | "medium" | "high" | "critical";
  evidence_ref: string;
};

export function runPolicyChecks(): PolicyResult[] {
  return [
    {
      policy_name: "governance/opa-placeholder",
      status: "pass",
      severity: "low",
      evidence_ref: "governance/policy-check.ts",
    },
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runPolicyChecks();
  const failed = results.filter((result) => result.status === "fail");

  for (const result of results) {
    // eslint-disable-next-line no-console
    console.info(
      `[policy-check] ${result.policy_name} => ${result.status} (${result.severity}) ${result.evidence_ref}`
    );
  }

  if (failed.length > 0) {
    // eslint-disable-next-line no-console
    console.error("[policy-check] blocking failures detected");
    process.exitCode = 1;
  }
}
