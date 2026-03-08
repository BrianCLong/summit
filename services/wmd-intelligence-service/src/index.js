"use strict";
/**
 * WMD Intelligence Service
 *
 * Central coordination service for nuclear and WMD intelligence operations.
 * Integrates data from all monitoring packages and provides unified intelligence assessment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WMDIntelligenceService = void 0;
const nuclear_monitoring_1 = require("@intelgraph/nuclear-monitoring");
const wmd_tracking_1 = require("@intelgraph/wmd-tracking");
const missile_intelligence_1 = require("@intelgraph/missile-intelligence");
const proliferation_networks_1 = require("@intelgraph/proliferation-networks");
const treaty_verification_1 = require("@intelgraph/treaty-verification");
const technical_analysis_1 = require("@intelgraph/technical-analysis");
class WMDIntelligenceService {
    nuclearFacilityTracker;
    enrichmentMonitor;
    chemicalWeaponsTracker;
    biologicalWeaponsTracker;
    missileTracker;
    missileTestMonitor;
    networkTracker;
    procurementMonitor;
    nptMonitor;
    iaeaSafeguardsMonitor;
    satelliteAnalyzer;
    seismicDetection;
    radionuclideMonitor;
    threatAssessor;
    constructor() {
        this.nuclearFacilityTracker = new nuclear_monitoring_1.NuclearFacilityTracker();
        this.enrichmentMonitor = new nuclear_monitoring_1.EnrichmentMonitor();
        this.chemicalWeaponsTracker = new wmd_tracking_1.ChemicalWeaponsTracker();
        this.biologicalWeaponsTracker = new wmd_tracking_1.BiologicalWeaponsTracker();
        this.missileTracker = new missile_intelligence_1.MissileTracker();
        this.missileTestMonitor = new missile_intelligence_1.MissileTestMonitor();
        this.networkTracker = new proliferation_networks_1.NetworkTracker();
        this.procurementMonitor = new proliferation_networks_1.ProcurementMonitor();
        this.nptMonitor = new treaty_verification_1.NPTMonitor();
        this.iaeaSafeguardsMonitor = new treaty_verification_1.IAEASafeguardsMonitor();
        this.satelliteAnalyzer = new technical_analysis_1.SatelliteImageryAnalyzer();
        this.seismicDetection = new technical_analysis_1.SeismicDetectionSystem();
        this.radionuclideMonitor = new technical_analysis_1.RadionuclideMonitor();
        this.threatAssessor = new wmd_tracking_1.WMDThreatAssessor();
    }
    /**
     * Comprehensive country WMD assessment
     */
    async assessCountryWMDCapability(country) {
        // Gather data from all trackers
        const nuclearFacilities = this.nuclearFacilityTracker.getFacilitiesByCountry(country);
        const missiles = this.missileTracker.getMissilesByCountry(country);
        const chemicalStockpile = this.chemicalWeaponsTracker.getStockpileByCountry(country);
        // Assess nuclear capability
        const enrichmentRisk = nuclearFacilities
            .filter(f => f.type === 'enrichment_plant')
            .length > 0 ? 'high' : 'low';
        // Assess missile capability
        const strategicMissiles = this.missileTracker.getStrategicMissiles(country);
        const hypersonicCap = this.missileTracker.assessHypersonicCapability(country);
        // Assess biological capability
        const bioCapability = this.biologicalWeaponsTracker.assessBioWeaponCapability(country);
        // Assess chemical capability
        const cwcCompliance = this.chemicalWeaponsTracker.assessCWCCompliance(country);
        // Get treaty compliance
        const nptCompliance = this.nptMonitor.getNonCompliantCountries()
            .some(c => c.country === country);
        // Calculate overall threat
        let threatScore = 0;
        if (enrichmentRisk === 'high')
            threatScore += 30;
        if (strategicMissiles.length > 0)
            threatScore += 25;
        if (hypersonicCap.threat_level === 'high')
            threatScore += 20;
        if (bioCapability.capability_level === 'advanced')
            threatScore += 15;
        if (!cwcCompliance.compliant)
            threatScore += 10;
        let overall_threat_level;
        if (threatScore >= 70)
            overall_threat_level = 'critical';
        else if (threatScore >= 50)
            overall_threat_level = 'high';
        else if (threatScore >= 30)
            overall_threat_level = 'moderate';
        else if (threatScore >= 15)
            overall_threat_level = 'low';
        else
            overall_threat_level = 'minimal';
        const recommendations = [];
        if (enrichmentRisk === 'high') {
            recommendations.push('Enhanced monitoring of enrichment facilities');
            recommendations.push('Diplomatic engagement on peaceful nuclear use');
        }
        if (nptCompliance) {
            recommendations.push('Escalate NPT compliance issues to UNSC');
        }
        if (hypersonicCap.threat_level === 'high') {
            recommendations.push('Track hypersonic weapons development closely');
        }
        return {
            nuclear_capability: {
                facilities: nuclearFacilities.length,
                enrichment_risk: enrichmentRisk,
                facilities_without_safeguards: this.nuclearFacilityTracker.getFacilitiesWithoutSafeguards().length
            },
            chemical_capability: {
                stockpile_size: this.chemicalWeaponsTracker.estimateTotalStockpile(country),
                cwc_compliant: cwcCompliance.compliant,
                violations: cwcCompliance.violations
            },
            biological_capability: bioCapability,
            missile_capability: {
                strategic_missiles: strategicMissiles.length,
                hypersonic: hypersonicCap
            },
            proliferation_risk: {
                active_networks: this.networkTracker.getActiveNetworks().length
            },
            treaty_compliance: {
                npt_compliant: !nptCompliance
            },
            overall_threat_level,
            recommendations
        };
    }
    /**
     * Monitor for early warning indicators
     */
    async detectEarlyWarningIndicators() {
        const alerts = [];
        // Check for undeclared facilities
        const undeclared = this.nuclearFacilityTracker.getUndeclaredFacilities();
        undeclared.forEach(facility => {
            alerts.push({
                type: 'undeclared_facility',
                severity: 'critical',
                description: `Undeclared ${facility.type} detected in ${facility.country}`,
                country: facility.country,
                recommended_action: 'Request IAEA inspection'
            });
        });
        // Check for nuclear tests
        const potentialTests = this.seismicDetection.identifyNuclearTests();
        potentialTests.forEach(test => {
            const yield_estimate = this.seismicDetection.estimateYield(test.magnitude);
            alerts.push({
                type: 'nuclear_test_detected',
                severity: 'critical',
                description: `Potential nuclear test detected (${yield_estimate.yield_kt.toFixed(1)} kt)`,
                recommended_action: 'Convene UNSC emergency session'
            });
        });
        // Check for active proliferation networks
        const activeNetworks = this.networkTracker.getActiveNetworks();
        activeNetworks.forEach(network => {
            if (network.threat_level === 'critical' || network.threat_level === 'high') {
                alerts.push({
                    type: 'proliferation_network',
                    severity: network.threat_level,
                    description: `Active proliferation network: ${network.name}`,
                    recommended_action: 'Coordinate interdiction operations'
                });
            }
        });
        return { alerts };
    }
    /**
     * Generate comprehensive intelligence report
     */
    async generateIntelligenceReport(country) {
        const capability = await this.assessCountryWMDCapability(country);
        return {
            country,
            report_date: new Date().toISOString(),
            executive_summary: `${country} assessed as ${capability.overall_threat_level} WMD threat`,
            capability_assessment: {
                nuclear: capability.nuclear_capability,
                chemical: capability.chemical_capability,
                biological: capability.biological_capability,
                missile: capability.missile_capability
            },
            threat_analysis: {
                overall_level: capability.overall_threat_level,
                proliferation_risk: capability.proliferation_risk
            },
            recent_activities: [],
            compliance_status: capability.treaty_compliance,
            recommendations: capability.recommendations
        };
    }
    /**
     * Track facility construction activity
     */
    async monitorFacilityConstruction(facilityId, satelliteImages) {
        const analysis = this.satelliteAnalyzer.analyzeConstruction(satelliteImages);
        const alerts = [];
        if (analysis.construction_detected) {
            alerts.push('Active construction detected');
        }
        return {
            construction_active: analysis.construction_detected,
            facility_type_assessment: 'Unknown - requires further analysis',
            alerts
        };
    }
}
exports.WMDIntelligenceService = WMDIntelligenceService;
exports.default = WMDIntelligenceService;
