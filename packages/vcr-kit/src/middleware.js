"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consentPresent = consentPresent;
const verifier_js_1 = require("./verifier.js");
function consentPresent(options) {
    const header = options.header ?? 'x-consent-receipt';
    return async (req, res, next) => {
        try {
            const receipt = options.extract?.(req) ?? readReceiptFromRequest(req, header);
            if (!receipt) {
                res.status(403).json({ error: 'Consent receipt required' });
                return;
            }
            const result = await (0, verifier_js_1.verifyConsentReceipt)(receipt, options);
            if (!result.verified) {
                res.status(403).json({ error: result.reason ?? 'Consent receipt invalid' });
                return;
            }
            req.consentReceipt = receipt;
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
function readReceiptFromRequest(req, headerName) {
    const headerValue = req.headers[headerName.toLowerCase()];
    if (typeof headerValue === 'string') {
        return parseReceipt(headerValue);
    }
    if (Array.isArray(headerValue) && headerValue.length > 0) {
        return parseReceipt(headerValue[0]);
    }
    const body = (req.body ?? {});
    const receipt = body.consentReceipt || body.consent_receipt;
    if (typeof receipt === 'string') {
        return parseReceipt(receipt);
    }
    if (typeof receipt === 'object' && receipt) {
        return receipt;
    }
    return undefined;
}
function parseReceipt(value) {
    try {
        return JSON.parse(value);
    }
    catch (error) {
        return undefined;
    }
}
