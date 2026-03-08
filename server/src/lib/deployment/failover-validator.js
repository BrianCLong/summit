"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailoverValidator = void 0;
class FailoverValidator {
    prober;
    activeRegionId;
    constructor(prober, initialActiveRegionId) {
        this.prober = prober;
        this.activeRegionId = initialActiveRegionId;
    }
    /**
     * Simulates a failover scenario by checking if traffic can be handled by a healthy standby
     * when the active region is reported as unhealthy.
     *
     * Note: This is a validator/simulation. In a real scenario, this would interact with
     * traffic manager APIs to verify routing rules.
     */
    async validateFailoverCapability() {
        const logs = [];
        logs.push(`Starting failover validation. Currently active: ${this.activeRegionId}`);
        // 1. Probe all regions
        const statuses = await this.prober.probeAll();
        const activeStatus = statuses.find(s => s.regionId === this.activeRegionId);
        if (!activeStatus) {
            return { success: false, message: 'Active region not found in configuration', logs };
        }
        logs.push(`Active region status: ${activeStatus.isHealthy ? 'Healthy' : 'Unhealthy'}`);
        // 2. Identify a candidate for failover
        const candidates = statuses.filter(s => s.regionId !== this.activeRegionId && s.isHealthy);
        if (candidates.length === 0) {
            logs.push('No healthy standby regions available.');
            return {
                success: false,
                message: 'Failover impossible: No healthy standby regions.',
                logs
            };
        }
        const bestCandidate = candidates[0]; // Simplistic selection
        logs.push(`Identified failover candidate: ${bestCandidate.regionName} (${bestCandidate.regionId})`);
        // 3. Simulate Failover Logic
        // In a real test, we might purposely inject a failure into the active region here.
        // For this validator, we confirm that if Active went down, Candidate is ready.
        // We can "simulate" a switch by updating internal state
        const previous = this.activeRegionId;
        this.activeRegionId = bestCandidate.regionId;
        logs.push(`Failover simulated. New active region: ${this.activeRegionId}`);
        return {
            success: true,
            message: 'Failover validation successful. Standby region is healthy and ready.',
            previousActiveRegion: previous,
            newActiveRegion: this.activeRegionId,
            logs
        };
    }
}
exports.FailoverValidator = FailoverValidator;
