export interface Constraint {
  id: string
  denyByDefault: boolean
  severity: "block" | "review" | "warn"
  // Returns true if allowed; false if violation
  allow: (ctx: unknown) => boolean
}

export function compileConstraints(): Constraint[] {
  // TODO: load from .github/policies/ael/*.yml via a policy loader
  return [
    {
      id: "AEL-CONSTRAINT-NO-PROD-WRITE-WITHOUT-APPROVAL",
      denyByDefault: true,
      severity: "block",
      allow: (ctx: any) => {
        // TODO: inspect ctx for approval token
        if (ctx && ctx.approval === "APPROVED") {
          return true;
        }
        return false;
      }
    }
  ]
}
