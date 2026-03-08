"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWindowOpen = isWindowOpen;
exports.canRoute = canRoute;
exports.pickModel = pickModel;
const luxon_1 = require("luxon");
function isWindowOpen(windows, now = luxon_1.DateTime.local()) {
    if (!windows || windows.length === 0)
        return true; // no windows means always on
    const wd = now.weekday % 7; // 1..7 → 0..6
    const hm = now.toFormat('HH:mm');
    return windows.some((w) => (w.days ? w.days.includes(wd) : true) && hm >= w.start && hm < w.end);
}
function canRoute(model) {
    if (!isWindowOpen(model.usage_windows))
        return { ok: false, reason: 'window_closed' };
    if (model.counters.rpm >= model.rpm_cap)
        return { ok: false, reason: 'rpm_exhausted' };
    if (model.counters.tpm >= model.tpm_cap)
        return { ok: false, reason: 'tpm_exhausted' };
    if (model.daily_usd_cap && model.counters.usd_today >= model.daily_usd_cap) {
        return { ok: false, reason: 'budget_exhausted' };
    }
    return { ok: true };
}
function pickModel(candidates, pref = [], fallback = []) {
    const denied = {};
    const order = [
        ...pref,
        ...candidates.map((c) => c.name).filter((n) => !pref.includes(n)),
        ...fallback,
    ];
    for (const name of order) {
        const m = candidates.find((c) => c.name === name);
        if (!m)
            continue;
        const gate = canRoute(m);
        if (gate.ok)
            return { chosen: m, denied };
        denied[name] = gate.reason || 'unknown';
    }
    return { denied };
}
