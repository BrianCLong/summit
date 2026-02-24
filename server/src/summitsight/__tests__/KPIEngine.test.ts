import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { KPIEngine } from '../engine/KPIEngine';
import { SummitsightDataService } from '../SummitsightDataService';

// Mock DataService
jest.mock('../SummitsightDataService');

describe('KPIEngine', () => {
    let kpiEngine: KPIEngine;
    let mockDataService: jest.Mocked<SummitsightDataService>;

    beforeEach(() => {
        // Reset singleton (if possible, or just re-instantiate if we mock the instance)
        // Since KPIEngine is a singleton, we need to be careful.
        // Ideally we'd have a reset method, but for this test we'll rely on the mocked dependency.
        (SummitsightDataService as any).mockClear();
        kpiEngine = KPIEngine.getInstance();
        mockDataService = (kpiEngine as any).dataService;
    });

    it('should evaluate threshold correctly (Higher is Better)', async () => {
        const mockDef = {
            kpi_id: 'test.kpi',
            name: 'Test KPI',
            category: 'engineering',
            direction: 'higher_is_better',
            threshold_red: 50,
            threshold_yellow: 80
        };

        mockDataService.getKPIDefinitions.mockResolvedValue([mockDef as any]);
        mockDataService.getKPIValues.mockResolvedValue([{
            kpi_id: 'test.kpi',
            value: 90,
            time_bucket: new Date().toISOString(),
            period: 'daily'
        } as any]);

        const result = await kpiEngine.getKPIStatus('test.kpi');
        expect(result.status).toBe('green');
    });

    it('should evaluate threshold correctly (Lower is Better)', async () => {
        const mockDef = {
            kpi_id: 'test.latency',
            name: 'Test Latency',
            category: 'engineering',
            direction: 'lower_is_better',
            threshold_red: 1000,
            threshold_yellow: 500
        };

        mockDataService.getKPIDefinitions.mockResolvedValue([mockDef as any]);

        // Test Red Case
        mockDataService.getKPIValues.mockResolvedValue([{
            kpi_id: 'test.latency',
            value: 1200,
            time_bucket: new Date().toISOString(),
            period: 'daily'
        } as any]);

        const result = await kpiEngine.getKPIStatus('test.latency');
        expect(result.status).toBe('red');
    });

    it('should return unknown status if no value exists', async () => {
        const mockDef = {
            kpi_id: 'test.empty',
            name: 'Empty KPI',
            category: 'engineering',
            direction: 'higher_is_better'
        };

        mockDataService.getKPIDefinitions.mockResolvedValue([mockDef as any]);
        mockDataService.getKPIValues.mockResolvedValue([]);

        const result = await kpiEngine.getKPIStatus('test.empty');
        expect(result.status).toBe('unknown');
        expect(result.currentValue).toBeNull();
    });
});
