import { createPolicyClient } from "./opaClient";
export async function authorize(reqCtx: any, action: "conduct"|"preview", ctx: any) {
  const opa = createPolicyClient(process.env.OPA_URL!);
  const input = { user: reqCtx.user, action, context: ctx };
  const { result } = await opa.evaluate("conductor/authz/allow", input);
  if (!result) throw new Error("PolicyDenied");
}