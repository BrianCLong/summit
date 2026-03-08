import axios from "axios";
import type { AuthzInput, AuthzResult } from "./types";

const DEFAULT_OPA_URL =
  "http://companyos-opa:8181/v1/data/companyos/authz/customer/decision";

export async function evaluateCustomerRead(input: AuthzInput): Promise<AuthzResult> {
  const opaUrl = process.env.OPA_URL ?? DEFAULT_OPA_URL;
  const { data } = await axios.post(opaUrl, { input });

  const result = data.result ?? {};
  return {
    allow: Boolean(result.allow),
    reason: typeof result.reason === "string" ? result.reason : undefined,
  };
}
