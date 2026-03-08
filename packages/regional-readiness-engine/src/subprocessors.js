"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubprocessorRegistry = void 0;
class SubprocessorRegistry {
    entries = new Map();
    register(entry) {
        this.entries.set(entry.name, { ...entry });
    }
    isAllowed(name, regionId, dataClass) {
        const entry = this.entries.get(name);
        if (!entry) {
            return false;
        }
        return entry.approvedRegions.includes(regionId) && entry.dataClasses.includes(dataClass);
    }
    getCustomerView(regionId) {
        return Array.from(this.entries.values()).filter((entry) => entry.approvedRegions.includes(regionId));
    }
}
exports.SubprocessorRegistry = SubprocessorRegistry;
