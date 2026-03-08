"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSensitivity = void 0;
exports.redactSensitive = redactSensitive;
var DataSensitivity;
(function (DataSensitivity) {
    DataSensitivity["NON_SENSITIVE"] = "NON_SENSITIVE";
    DataSensitivity["INTERNAL"] = "INTERNAL";
    DataSensitivity["SENSITIVE_PII"] = "SENSITIVE_PII";
    DataSensitivity["HIGHLY_SENSITIVE"] = "HIGHLY_SENSITIVE";
})(DataSensitivity || (exports.DataSensitivity = DataSensitivity = {}));
const LEVEL_ORDER = [
    DataSensitivity.NON_SENSITIVE,
    DataSensitivity.INTERNAL,
    DataSensitivity.SENSITIVE_PII,
    DataSensitivity.HIGHLY_SENSITIVE
];
function redactSensitive(data, allowedLevel) {
    if (!data || typeof data !== 'object')
        return data;
    if (Array.isArray(data)) {
        return data.map(item => redactSensitive(item, allowedLevel));
    }
    const result = {};
    const allowedIdx = LEVEL_ORDER.indexOf(allowedLevel);
    for (const key of Object.keys(data)) {
        // Check if key implies sensitivity or if value object has a _sensitivity tag
        // For this prototype, we assume a metadata structure or convention
        // Convention: keys ending in _PII are sensitive
        // Or objects having _sensitivity property
        if (key.endsWith('_PII')) {
            if (allowedIdx < LEVEL_ORDER.indexOf(DataSensitivity.SENSITIVE_PII)) {
                result[key] = '[REDACTED]';
                continue;
            }
        }
        const value = data[key];
        if (value && typeof value === 'object' && value._sensitivity) {
            const itemLevel = value._sensitivity;
            if (LEVEL_ORDER.indexOf(itemLevel) > allowedIdx) {
                result[key] = { _redacted: true, _reason: 'Sensitivity Level' };
            }
            else {
                result[key] = redactSensitive(value, allowedLevel);
            }
        }
        else {
            result[key] = redactSensitive(value, allowedLevel);
        }
    }
    return result;
}
