import { CheckResult } from "../lib/types";

export async function schemaParityCheck(): Promise<CheckResult> {
  // TODO: Implement schema check
  return {
    name: "schema",
    status: "pass",
    details: { note: "Not implemented yet" },
  };
}
