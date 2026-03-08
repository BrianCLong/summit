"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireReason = requireReason;
function requireReason(labels) {
    return (req, res, next) => {
        if (labels.includes('sensitivity:restricted') && !req.headers['x-rfa']) {
            return res.status(403).json({ error: 'reason-for-access required' });
        }
        next();
    };
}
