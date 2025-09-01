export function withinErrorBound(observed, expectedVar, z = 1.96) {
    const bound = Math.sqrt(expectedVar) * z;
    return { ok: Math.abs(observed) <= bound, bound };
}
//# sourceMappingURL=ErrorMonitor.js.map