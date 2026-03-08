"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const VendorService_js_1 = require("../VendorService.js");
(0, globals_1.describe)('VendorService Inventory', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new VendorService_js_1.VendorService();
    });
    (0, globals_1.it)('should create a vendor with default inventory fields', async () => {
        const vendorData = {
            name: 'New SaaS',
            domain: 'newsaas.com',
            tier: 'strategic',
            status: 'active',
            complianceStatus: {
                soc2: true,
                iso27001: false,
                gdpr: true,
            },
            owner: 'alice@company.com',
            purpose: 'Marketing automation',
            criticality: 'Tier 1'
        };
        const vendor = await service.createVendor(vendorData);
        (0, globals_1.expect)(vendor.id).toBeDefined();
        (0, globals_1.expect)(vendor.name).toBe('New SaaS');
        (0, globals_1.expect)(vendor.criticality).toBe('Tier 1');
        (0, globals_1.expect)(vendor.financeRecords).toEqual([]);
        (0, globals_1.expect)(vendor.ssoLogs).toEqual([]);
        (0, globals_1.expect)(vendor.expenseData).toEqual([]);
    });
    (0, globals_1.it)('should update vendor with finance records', async () => {
        const vendorData = {
            name: 'Cloud Provider',
            domain: 'cloud.com',
            tier: 'strategic',
            status: 'active',
            complianceStatus: {
                soc2: true,
                iso27001: true,
                gdpr: true,
            },
            criticality: 'Tier 0'
        };
        const vendor = await service.createVendor(vendorData);
        const record = {
            id: 'inv-123',
            amount: 5000,
            currency: 'USD',
            date: '2023-10-01',
            description: 'Monthly Hosting'
        };
        const updated = await service.updateVendor(vendor.id, {
            financeRecords: [record]
        });
        (0, globals_1.expect)(updated).toBeDefined();
        (0, globals_1.expect)(updated?.financeRecords).toHaveLength(1);
        (0, globals_1.expect)(updated?.financeRecords[0].amount).toBe(5000);
    });
});
