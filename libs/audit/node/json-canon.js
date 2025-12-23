"use strict";
// Canonical JSON stringify to match Python's json.dumps(sort_keys=True, separators=(',', ':'))
// Python's default separators are (', ', ': ') but for hashing we usually want compact.
// The Python SDK code uses: json.dumps(event_for_hashing, sort_keys=True, separators=(',', ':'))
// So we must match that: no spaces, sorted keys.
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
function stableStringify(obj) {
    var allKeys = [];
    JSON.stringify(obj, function (key, value) {
        allKeys.push(key);
        return value;
    });
    // This is tricky because JSON.stringify doesn't guarantee order except for non-integer keys in some engines.
    // The reliable way is to recursively rebuild the object with sorted keys.
    function sortObject(v) {
        if (Array.isArray(v)) {
            return v.map(sortObject);
        }
        else if (v !== null && typeof v === 'object') {
            var sortedKeys = Object.keys(v).sort();
            var result_1 = {};
            sortedKeys.forEach(function (key) {
                result_1[key] = sortObject(v[key]);
            });
            return result_1;
        }
        return v;
    }
    var sortedObj = sortObject(obj);
    return JSON.stringify(sortedObj);
}
