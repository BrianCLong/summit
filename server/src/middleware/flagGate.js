"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gate = gate;
const store_js_1 = require("../flags/store.js");
function gate(key) {
    return (req, res, next) => {
        const allowed = (0, store_js_1.getFlag)(key, {
            residency: req.headers['x-residency'],
            tenant: req.headers['x-tenant'],
        });
        if (!allowed)
            return res.status(403).json({ error: 'flag disabled' });
        next();
    };
}
