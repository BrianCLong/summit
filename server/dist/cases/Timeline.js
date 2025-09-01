const events = [];
export function record(ev) {
    events.push(ev);
}
export function list(caseId) {
    return events.filter(e => e.caseId === caseId);
}
//# sourceMappingURL=Timeline.js.map