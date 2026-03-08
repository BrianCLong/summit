"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibilityGap = visibilityGap;
function visibilityGap(connectivity, localEvidenceCount) {
    return connectivity !== "normal" && localEvidenceCount < 3;
}
