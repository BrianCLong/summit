"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDualWriteEnabled = isDualWriteEnabled;
exports.isShadowReadEnabled = isShadowReadEnabled;
exports.backfillRps = backfillRps;
exports.isCutoverEnabled = isCutoverEnabled;
exports.logMigrationFlags = logMigrationFlags;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const flagEnv = {
    "db.dual_write": process.env.DB_DUAL_WRITE,
    "db.shadow_read": process.env.DB_SHADOW_READ,
    "db.backfill.rps": process.env.DB_BACKFILL_RPS,
    "db.cutover.enabled": process.env.DB_CUTOVER_ENABLED,
};
function isDualWriteEnabled() {
    return coerceBool(flagEnv["db.dual_write"], true);
}
function isShadowReadEnabled() {
    return coerceBool(flagEnv["db.shadow_read"], false);
}
function backfillRps() {
    const raw = flagEnv["db.backfill.rps"];
    const parsed = raw ? Number(raw) : 50;
    return Number.isFinite(parsed) ? parsed : 50;
}
function isCutoverEnabled() {
    return coerceBool(flagEnv["db.cutover.enabled"], false);
}
function coerceBool(value, fallback) {
    if (!value)
        return fallback;
    const normalized = value.toLowerCase();
    return normalized === "true" ? true : normalized === "false" ? false : fallback;
}
function logMigrationFlags() {
    const payload = {
        dual_write: isDualWriteEnabled(),
        shadow_read: isShadowReadEnabled(),
        backfill_rps: backfillRps(),
        cutover_enabled: isCutoverEnabled(),
    };
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({ event: "migration_flags", payload }));
}
