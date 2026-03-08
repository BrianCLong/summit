"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageLedger = exports.InMemoryUsageLedger = void 0;
class InMemoryUsageLedger {
    records = [];
    recordUsage(record) {
        this.records.push({ ...record });
    }
    getRecords() {
        return [...this.records];
    }
    clear() {
        this.records = [];
    }
}
exports.InMemoryUsageLedger = InMemoryUsageLedger;
exports.usageLedger = new InMemoryUsageLedger();
