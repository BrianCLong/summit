function stripPii(row) {
    const copy = { ...row };
    delete copy.email;
    delete copy.name;
    return copy;
}
export function generateHuntReport(data) {
    const sanitized = {
        ...data,
        results: Array.isArray(data.results) ? data.results.map(stripPii) : []
    };
    return `# Hunt Report\n\n${JSON.stringify(sanitized, null, 2)}`;
}
export default generateHuntReport;
//# sourceMappingURL=HuntReport.js.map