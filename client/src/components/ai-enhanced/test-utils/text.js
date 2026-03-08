"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeText = normalizeText;
exports.expectTextAcrossElements = expectTextAcrossElements;
exports.expectLastAssistantMessageToContain = expectLastAssistantMessageToContain;
const react_1 = require("@testing-library/react");
function normalizeText(s) {
    return s
        .replace(/\u00A0/g, ' ') // nbsp
        .replace(/\u200B/g, '') // zero width space
        .replace(/\r\n|\r|\n/g, ' ') // newlines → spaces
        .replace(/\s+/g, ' ') // collapse
        .trim();
}
/** Wait until container's aggregate textContent matches pattern. */
async function expectTextAcrossElements(container, pattern, timeout = 10000) {
    if (!container) {
        throw new Error('Container element is null or undefined');
    }
    const isMatch = typeof pattern === 'string'
        ? (s) => normalizeText(s).includes(normalizeText(pattern))
        : (s) => pattern.test(normalizeText(s));
    await (0, react_1.waitFor)(() => {
        const text = normalizeText(container.textContent || '');
        if (!isMatch(text)) {
            throw new Error(`Expected text to match pattern. Got: "${text}"`);
        }
    }, { timeout });
}
async function expectLastAssistantMessageToContain(pattern, timeout = 10000) {
    await (0, react_1.waitFor)(() => {
        const log = document.querySelector('[data-testid="message-log"]');
        if (!log)
            throw new Error('message-log not found');
        const articles = Array.from(log.querySelectorAll('[role="article"][aria-label="assistant"]'));
        if (articles.length === 0)
            throw new Error('No assistant messages found');
        const last = articles[articles.length - 1];
        if (!last)
            throw new Error('Last assistant message is null');
        const isMatch = typeof pattern === 'string'
            ? (s) => normalizeText(s).includes(normalizeText(pattern))
            : (s) => pattern.test(normalizeText(s));
        const text = normalizeText(last.textContent || '');
        if (!isMatch(text)) {
            throw new Error(`Expected last assistant message to match pattern. Got: "${text}"`);
        }
    }, { timeout });
}
