"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flushMicrotasks = flushMicrotasks;
exports.flushAllTimersAndMicrotasks = flushAllTimersAndMicrotasks;
const react_1 = require("@testing-library/react");
async function flushMicrotasks() {
    await (0, react_1.act)(async () => {
        await Promise.resolve();
    });
}
async function flushAllTimersAndMicrotasks() {
    await (0, react_1.act)(async () => {
        if (jest.getTimerCount?.() > 0 && 'runOnlyPendingTimersAsync' in jest) {
            // @ts-ignore
            await jest.runOnlyPendingTimersAsync();
        }
        await Promise.resolve();
    });
}
