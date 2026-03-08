"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
const additive_1 = require("../secret_sharing/additive");
function evaluate(bundle) {
    // Mock evaluation: just reconstructs a specific feature sum
    // Real NIGNN would do graph convolution on shares
    // For toy pipeline, we just demonstrate we can reconstruct from the shares
    // if we have enough of them.
    return (0, additive_1.reconstruct)(bundle);
}
