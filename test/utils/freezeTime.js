"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.freezeAt = freezeAt;
function freezeAt(iso = '2024-01-01T00:00:00Z') {
    const d = new Date(iso);
    jest.useFakeTimers({ now: d });
    return () => jest.useRealTimers();
}
