"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentInspector = void 0;
var ContentInspector = /** @class */ (function () {
    function ContentInspector() {
        this.dirtyWords = [
            'TOP SECRET',
            'NOFORN',
            'ORCON',
            'GAMMA',
            'HCS',
            'RESERVED',
        ];
    }
    /**
     * Deep Content Inspection (DCI)
     * Scans objects recursively for dirty words or patterns that violate the target domain.
     */
    ContentInspector.prototype.inspect = function (data, targetClassification) {
        var issues = [];
        // If target is UNCLASSIFIED, we are very strict.
        if (targetClassification === 'UNCLASSIFIED') {
            this.scanRecursive(data, issues);
        }
        if (issues.length > 0) {
            return { passed: false, issues: issues };
        }
        return { passed: true, issues: [], sanitizedContent: data };
    };
    ContentInspector.prototype.scanRecursive = function (obj, issues, path) {
        var _this = this;
        if (path === void 0) { path = ''; }
        if (typeof obj === 'string') {
            this.checkString(obj, issues, path);
        }
        else if (Array.isArray(obj)) {
            obj.forEach(function (item, index) { return _this.scanRecursive(item, issues, "".concat(path, "[").concat(index, "]")); });
        }
        else if (typeof obj === 'object' && obj !== null) {
            for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                this.scanRecursive(value, issues, "".concat(path, ".").concat(key));
            }
        }
    };
    ContentInspector.prototype.checkString = function (text, issues, path) {
        var upper = text.toUpperCase();
        for (var _i = 0, _a = this.dirtyWords; _i < _a.length; _i++) {
            var word = _a[_i];
            if (upper.includes(word)) {
                issues.push("Found restricted term \"".concat(word, "\" at ").concat(path));
            }
        }
        // Regex for potential SSNs or specific patterns could go here
        // e.g. /\b\d{3}-\d{2}-\d{4}\b/
    };
    return ContentInspector;
}());
exports.ContentInspector = ContentInspector;
