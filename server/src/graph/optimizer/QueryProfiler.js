"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryProfiler = void 0;
class QueryProfiler {
    queryId;
    marks = new Map();
    profile = {};
    constructor(queryId) {
        this.queryId = queryId;
        this.profile.queryId = queryId;
        this.profile.timestamp = Date.now();
        this.profile.breakdown = {
            parsing: 0,
            planning: 0,
            optimization: 0,
            execution: 0
        };
    }
    start(phase) {
        this.marks.set(`${phase}_start`, performance.now());
    }
    end(phase) {
        const start = this.marks.get(`${phase}_start`);
        if (start) {
            const duration = performance.now() - start;
            if (phase === 'total') {
                this.profile.totalDuration = duration;
            }
            else {
                if (this.profile.breakdown) {
                    this.profile.breakdown[phase] = duration;
                }
            }
        }
    }
    getProfile() {
        return this.profile;
    }
}
exports.QueryProfiler = QueryProfiler;
