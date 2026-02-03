import { User } from "../lib/auth.js";
import { FactFlowReport } from "./types.js";

export class PublishGate {
  checkPublishPermission(user: User, report: FactFlowReport): boolean {
    // 1. Role Check
    if (user.role !== "EDITOR" && user.role !== "ADMIN") {
      console.warn(`User ${user.id} denied publish: insufficient role ${user.role}`);
      return false;
    }

    // 2. Content Safety Check (Simple heuristic)
    const hasUnreviewedClaims = report.claims.some(
      (c) => c.verdict === "needs_review" || c.verdict === "unverified"
    );

    if (hasUnreviewedClaims && user.role !== "ADMIN") {
       // Admins can override, Editors cannot publish unreviewed content
       console.warn(`User ${user.id} denied publish: content needs review`);
       return false;
    }

    return true;
  }
}
