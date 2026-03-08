"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorService = void 0;
const crypto_1 = require("crypto");
class VendorService {
    // In-memory store for prototype
    vendors = new Map();
    async createVendor(data) {
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        // Initialize with defaults for arrays, allowing override by data
        const vendor = {
            financeRecords: [],
            ssoLogs: [],
            expenseData: [],
            ...data,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.vendors.set(id, vendor);
        return vendor;
    }
    async getVendor(id) {
        return this.vendors.get(id);
    }
    async listVendors() {
        return Array.from(this.vendors.values());
    }
    async updateVendor(id, data) {
        const vendor = this.vendors.get(id);
        if (!vendor)
            return undefined;
        const updated = {
            ...vendor,
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.vendors.set(id, updated);
        return updated;
    }
}
exports.VendorService = VendorService;
