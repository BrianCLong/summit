"use strict";
/**
 * JSON Reporter - Generates structured JSON reports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonReporter = void 0;
class JsonReporter {
    /**
     * Generate JSON report
     */
    generate(report, pretty = true) {
        return JSON.stringify(report, null, pretty ? 2 : 0);
    }
}
exports.JsonReporter = JsonReporter;
