"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.step = step;
function step(split, sprt, utilDelta) {
    if (sprt === 'reject')
        return Math.max(0, split - 0.5);
    if (sprt === 'accept')
        return Math.min(1, split + 0.5);
    return Math.max(0, Math.min(1, split + 0.1 * Math.sign(utilDelta)));
}
