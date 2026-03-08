"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStepUp = requireStepUp;
function requireStepUp(level = 2) {
    return (req, res, next) => {
        const mfa = Number(req.headers['x-mfa-level'] || 0);
        if (mfa >= level)
            return next();
        res.status(401).json({ error: 'step_up_required', level });
    };
}
