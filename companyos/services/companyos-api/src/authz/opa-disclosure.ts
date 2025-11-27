import axios from "axios";
import type { AuthzInput, AuthzResult } from "./types";

const OPA_DISCLOSURE_URL =
  process.env.OPA_DISCLOSURE_URL ??
  "http://companyos-opa:8181/v1/data/companyos/authz/disclosure_export/decision";

export async function evaluateDisclosureExport(
  input: AuthzInput
): Promise<AuthzResult> {
  const { data } = await axios.post(OPA_DISCLOSURE_URL, { input });
  const result = data.result ?? {};
  return {
    allow: Boolean(result.allow),
    reason: typeof result.reason === "string" ? result.reason : undefined
  };
}
