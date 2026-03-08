"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBuilder = pickBuilder;
function pickBuilder(pkg) {
    const d = pkg.has;
    if (d.BAZEL)
        return 'bazel';
    if (d.CNB)
        return 'buildpacks';
    if (d.DOCKERFILE)
        return 'docker';
    return 'turbo';
}
