"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privacyLogger = privacyLogger;
exports.egressGuard = egressGuard;
const redact_js_1 = require("../privacy/redact.js");
function privacyLogger(req, res, next) {
    const old = res.json;
    res.json = function (body) {
        try {
            body = (0, redact_js_1.redact)(JSON.parse(JSON.stringify(body)));
        }
        catch { }
        return old.call(this, body);
    };
    next();
}
function egressGuard(req, res, next) {
    if (/export|download/.test(req.path) && req.query.includePII === 'true')
        return res.status(403).json({ error: 'PII export blocked' });
    next();
}
