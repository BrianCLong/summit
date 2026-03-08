"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRichOutput = toRichOutput;
function toRichOutput(data) {
    if (isTestReport(data)) {
        return {
            kind: 'test-report',
            title: 'Test Execution Report',
            data: data,
        };
    }
    if ('rows' in data && 'headers' in data) {
        return {
            kind: 'table',
            data,
        };
    }
    if ('mermaid' in data) {
        return {
            kind: 'diagram',
            data,
        };
    }
    return {
        kind: 'markdown',
        data,
    };
}
function isTestReport(value) {
    const maybe = value;
    return (typeof maybe?.summary?.passed === 'number' &&
        typeof maybe?.summary?.failed === 'number' &&
        Array.isArray(maybe?.cases));
}
