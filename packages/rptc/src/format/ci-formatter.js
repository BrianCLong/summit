"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatValidationResultForCI = formatValidationResultForCI;
exports.formatTestRunForCI = formatTestRunForCI;
function formatValidationResultForCI(template, result) {
    const header = `[RPTC] Validation ${result.valid ? 'PASSED' : 'FAILED'} :: template=${template.name}`;
    if (result.valid) {
        return `${header} :: slots=${Object.keys(template.slots).length}`;
    }
    const lines = result.errors
        .map((error) => {
        const details = error.details
            .map((detail) => `${detail.code} (${detail.message})`)
            .join(', ');
        return `  - slot=${String(error.slot)} :: ${details}`;
    })
        .join('\n');
    return `${header}\n${lines}`;
}
function formatTestRunForCI(suiteName, results) {
    const status = results.passed ? 'PASSED' : 'FAILED';
    const lines = results.results
        .filter((result) => !result.passed)
        .map((result) => {
        const message = result.error?.message ?? 'Unknown failure';
        return `  - case="${result.testCase.description}" slot=${String(result.testCase.slot)} :: ${message}`;
    })
        .join('\n');
    return lines.length > 0
        ? `[RPTC] TestSuite ${status} :: ${suiteName}\n${lines}`
        : `[RPTC] TestSuite ${status} :: ${suiteName}`;
}
