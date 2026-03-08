"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
const tags_js_1 = require("./tags.js");
function redact(obj) {
    if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
            const tag = tags_js_1.schemaTags[`${obj.__table || ''}.${k}`];
            if (tag === 'PII' || tag === 'SENSITIVE')
                obj[k] = '***';
            else
                redact(obj[k]);
        }
    }
    return obj;
}
