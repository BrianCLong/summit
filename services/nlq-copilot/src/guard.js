"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forbidDangerous = forbidDangerous;
exports.estimate = estimate;
function forbidDangerous(cypher) {
    const banned = [/DETACH\s+DELETE/i, /CALL\s+db\.msql/i, /apoc\.periodic/i];
    if (banned.some((rx) => rx.test(cypher))) {
        throw new Error('dangerous_query');
    }
    return true;
}
function estimate(cypher) {
    const m = /LIMIT\s+(\d+)/i.exec(cypher);
    return { rows: m ? Number(m[1]) : 1000 };
}
