"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForIdle = waitForIdle;
const react_1 = require("@testing-library/react");
async function waitForIdle(timeout = 2000) {
    await (0, react_1.waitFor)(() => {
        const statusEl = react_1.screen.getByRole('status', {
            name: /assistant-status/i,
        });
        const text = statusEl.textContent || '';
        if (!text.match(/online/i)) {
            throw new Error(`Expected status to be idle/online, got: "${text}"`);
        }
    }, { timeout });
}
