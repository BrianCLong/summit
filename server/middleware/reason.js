"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireReason = requireReason;
function requireReason(actions) {
    return (req, res, next) => {
        if (!actions.includes(req.path))
            return next();
        const reason = req.header('x-reason') || '';
        if (!reason)
            return res.status(400).json({ error: 'reason_required' });
        req.reason = reason;
        next();
    };
}
