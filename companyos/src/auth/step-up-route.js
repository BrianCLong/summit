"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepUpHandler = stepUpHandler;
const DEV_STEP_UP_CODE = process.env.COMPANYOS_STEP_UP_CODE ?? '123456';
function stepUpHandler(req, res) {
    const { code } = req.body ?? {};
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'invalid_code' });
    }
    if (code !== DEV_STEP_UP_CODE) {
        return res.status(401).json({ error: 'step_up_failed' });
    }
    res.cookie('companyos_mfa', '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    });
    return res.status(200).json({ status: 'ok' });
}
