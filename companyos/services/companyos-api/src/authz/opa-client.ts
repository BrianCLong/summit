import axios from "axios";
import type { AuthzInput, AuthzResult } from "./types";

const OPA_URL =
  process.env.OPA_URL ??
  "http://companyos-opa:8181/v1/data/companyos/authz/customer/decision";

export async function evaluateCustomerRead(input: AuthzInput): Promise<AuthzResult> {
  const { data } = await axios.post(OPA_URL, { input });

  const result = data.result ?? {};
  return {
    allow: Boolean(result.allow),
    reason: typeof result.reason === "string" ? result.reason : undefined,
  };
}
