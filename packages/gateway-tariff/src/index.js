"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.score = score;
exports.tariff = tariff;
function score(sig) {
    let s = 0;
    if (sig.xformSig === 'nokpw')
        s += 3;
    if (/NOEXIF/.test(sig.formatSig))
        s += 1;
    if (/pdf.*:0:/.test(sig.formatSig))
        s += 1;
    const hh = Number(sig.timingSig.split('h')[0]);
    if (hh >= 0 && (hh < 6 || hh > 22))
        s += 1;
    return s;
}
function tariff(sig) {
    const sc = score(sig);
    return {
        minProofLevel: sc >= 3 ? 'strict' : 'standard',
        rateLimit: Math.max(1, 10 - sc * 2),
        throttleMs: sc * 2000,
    };
}
