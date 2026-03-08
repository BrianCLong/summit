"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldPreempt = shouldPreempt;
function shouldPreempt(remainingUSD, priority) {
    return remainingUSD < 0.1 && priority === 'lo';
}
