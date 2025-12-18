import type { Request, Response, NextFunction } from "express";
import { Flags } from "../flags";
import axios from "axios";

export async function policyGuard(req: Request, res: Response, next: NextFunction) {
  if (!Flags.LAC_ENFORCE || req.method !== "POST" || req.path !== "/graphql") return next();
  try {
    const decision = await axios.post(process.env.POLICY_COMPILER_URL + "/decide", {
      query: req.body?.query, variables: req.body?.variables, caller: req.user ?? {}
    }, { timeout: 1000 });
    if (decision.data?.allow) return next();
    return res.status(403).json({ error: "Denied by policy", reason: decision.data?.reason });
  } catch (e) {
    // Fail closed
    return res.status(503).json({ error: "Policy service unavailable" });
  }
}
