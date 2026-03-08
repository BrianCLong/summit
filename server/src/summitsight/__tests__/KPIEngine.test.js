"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const KPIEngine_js_1 = require("../engine/KPIEngine.js");
const SummitsightDataService_js_1 = require("../SummitsightDataService.js");
// Mock DataService
globals_1.jest.mock('../SummitsightDataService');
(0, globals_1.describe)('KPIEngine', () => {
    let kpiEngine;
    let mockDataService;
    (0, globals_1.beforeEach)(() => {
        // Reset singleton (if possible, or just re-instantiate if we mock the instance)
        // Since KPIEngine is a singleton, we need to be careful.
        // Ideally we'd have a reset method, but for this test we'll rely on the mocked dependency.
        SummitsightDataService_js_1.SummitsightDataService.mockClear();
        kpiEngine = KPIEngine_js_1.KPIEngine.getInstance();
        mockDataService = kpiEngine.dataService;
    });
    (0, globals_1.it)('should evaluate threshold correctly (Higher is Better)', async () => {
        const mockDef = {
            kpi_id: 'test.kpi',
            name: 'Test KPI',
            category: 'engineering',
            direction: 'higher_is_better',
            threshold_red: 50,
            threshold_yellow: 80
        };
        mockDataService.getKPIDefinitions.mockResolvedValue([mockDef]);
        mockDataService.getKPIValues.mockResolvedValue([{
                kpi_id: 'test.kpi',
                value: 90,
                time_bucket: new Date().toISOString(),
                period: 'daily'
            }]);
        const result = await kpiEngine.getKPIStatus('test.kpi');
        (0, globals_1.expect)(result.status).toBe('green');
    });
    (0, globals_1.it)('should evaluate threshold correctly (Lower is Better)', async () => {
        const mockDef = {
            kpi_id: 'test.latency',
            name: 'Test Latency',
            category: 'engineering',
            direction: 'lower_is_better',
            threshold_red: 1000,
            threshold_yellow: 500
        };
        mockDataService.getKPIDefinitions.mockResolvedValue([mockDef]);
        // Test Red Case
        mockDataService.getKPIValues.mockResolvedValue([{
                kpi_id: 'test.latency',
                value: 1200,
                time_bucket: new Date().toISOString(),
                period: 'daily'
            }]);
        const result = await kpiEngine.getKPIStatus('test.latency');
        (0, globals_1.expect)(result.status).toBe('red');
    });
    (0, globals_1.it)('should return unknown status if no value exists', async () => {
        const mockDef = {
            kpi_id: 'test.empty',
            name: 'Empty KPI',
            category: 'engineering',
            direction: 'higher_is_better'
        };
        mockDataService.getKPIDefinitions.mockResolvedValue([mockDef]);
        mockDataService.getKPIValues.mockResolvedValue([]);
        const result = await kpiEngine.getKPIStatus('test.empty');
        (0, globals_1.expect)(result.status).toBe('unknown');
        (0, globals_1.expect)(result.currentValue).toBeNull();
    });
});
