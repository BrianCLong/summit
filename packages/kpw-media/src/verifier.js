"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyKPWMediaBundle = verifyKPWMediaBundle;
const wallet_1 = require("./wallet");
function verifyKPWMediaBundle(bundle, publicPem) {
    const ok = (0, wallet_1.verifyDisclosure)(bundle, publicPem);
    const hasContradiction = bundle.disclosedSteps.some((s) => !!s.contradiction);
    return { ok, hasContradiction };
}
