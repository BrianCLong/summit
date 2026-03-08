"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KPIEngine = void 0;
const SummitsightDataService_js_1 = require("../SummitsightDataService.js");
class KPIEngine {
    dataService;
    static instance;
    constructor() {
        this.dataService = new SummitsightDataService_js_1.SummitsightDataService();
    }
    static getInstance() {
        if (!KPIEngine.instance) {
            KPIEngine.instance = new KPIEngine();
        }
        return KPIEngine.instance;
    }
    /**
     * Retrieves the definition and latest value for a KPI.
     */
    async getKPIStatus(kpiId, tenantId) {
        const defs = await this.dataService.getKPIDefinitions();
        const def = defs.find(d => d.kpi_id === kpiId);
        if (!def)
            throw new Error(`KPI ${kpiId} not found`);
        const values = await this.dataService.getKPIValues(kpiId, tenantId, 'daily', 1);
        const latest = values[0];
        return {
            definition: def,
            currentValue: latest ? Number(latest.value) : null,
            status: this.evaluateThreshold(def, latest ? Number(latest.value) : null),
            lastUpdated: latest ? latest.time_bucket : null
        };
    }
    evaluateThreshold(def, value) {
        if (value === null)
            return 'unknown';
        // Logic depends on direction
        const higherBetter = def.direction === 'higher_is_better';
        // Simple logic for now: if threshold exists
        if (def.threshold_red !== undefined && def.threshold_yellow !== undefined) {
            if (higherBetter) {
                if (value < def.threshold_red)
                    return 'red';
                if (value < def.threshold_yellow)
                    return 'yellow';
                return 'green';
            }
            else {
                if (value > def.threshold_red)
                    return 'red';
                if (value > def.threshold_yellow)
                    return 'yellow';
                return 'green';
            }
        }
        return 'green'; // Default
    }
    /**
     * Refreshes a specific KPI for a tenant for a specific day.
     * In a real system, this would be complex dynamic SQL generation or calling specific calculator functions.
     */
    async computeAndStoreKPI(kpiId, tenantId, date) {
        let value = 0;
        // ROUTING LOGIC for KPI Calculation
        switch (kpiId) {
            case 'eng.deployment_freq':
                value = await this.calculateDeploymentFreq(tenantId, date);
                break;
            case 'eng.change_fail_rate':
                value = await this.calculateChangeFailRate(tenantId, date);
                break;
            case 'sec.incident_rate':
                value = await this.calculateIncidentRate(tenantId, date);
                break;
            default:
                // For now, simulate random variation for demo purposes if not implemented
                value = Math.random() * 100;
        }
        const kpiValue = {
            kpi_id: kpiId,
            tenant_id: tenantId,
            time_bucket: date, // ISO Date string
            period: 'daily',
            value: value,
            dimension_filters: {}
        };
        await this.dataService.saveKPIValue(kpiValue);
    }
    // --- Specific Calculators ---
    async calculateDeploymentFreq(tenantId, date) {
        return await this.dataService.aggregateDeploymentStats(tenantId, date);
    }
    async calculateChangeFailRate(tenantId, date) {
        return await this.dataService.aggregateChangeFailStats(tenantId, date);
    }
    async calculateIncidentRate(tenantId, date) {
        return await this.dataService.aggregateIncidentStats(tenantId, date);
    }
}
exports.KPIEngine = KPIEngine;
