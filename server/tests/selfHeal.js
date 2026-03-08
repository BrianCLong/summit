"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stabilize = stabilize;
function stabilize(testOutput) {
    if (/Randomized with seed (\d+)/.test(testOutput))
        return 'Set fixed seed via jest --seed=${1}';
    if (/Timeout.*async/.test(testOutput))
        return 'Wrap async with fake timers or increase timeout for flaky I/O';
    return 'Capture flake and quarantine with owner + hypothesis comment';
}
