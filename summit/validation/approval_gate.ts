export function requires_approval(plan: { operations: { kind: string }[] }): boolean {
    const risky = new Set(["delete", "bulk_edit", "privileged_tool"]);
    return plan.operations.some(op => risky.has(op.kind));
}
