"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldEscalate = shouldEscalate;
function shouldEscalate(conf) {
    if (conf.schemaErrors > 0)
        return true;
    if (conf.risk > 0.75 && conf.evalProxy < 0.82)
        return true;
    return false;
}
