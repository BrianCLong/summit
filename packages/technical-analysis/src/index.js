"use strict";
/**
 * Technical Analysis Package
 *
 * Advanced technical analysis capabilities including satellite imagery,
 * seismic detection, radionuclide monitoring, and OSINT analysis.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSINTAnalyzer = exports.RadionuclideMonitor = exports.SeismicDetectionSystem = exports.SatelliteImageryAnalyzer = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./satellite-imagery.js"), exports);
__exportStar(require("./seismic-detection.js"), exports);
__exportStar(require("./radionuclide-monitoring.js"), exports);
__exportStar(require("./osint-analyzer.js"), exports);
class SatelliteImageryAnalyzer {
    analyzeConstruction(images) {
        const sorted = images.sort((a, b) => new Date(a.capture_date).getTime() - new Date(b.capture_date).getTime());
        const construction = sorted.some(img => img.analysis_results?.some(a => a.change_detected));
        return {
            construction_detected: construction,
            timeline: sorted.map(img => ({
                date: img.capture_date,
                progress: img.analysis_results?.[0]?.confidence || 0
            }))
        };
    }
    detectFacilityExpansion(before, after) {
        // Simplified - in reality this would use computer vision
        const beforeChanges = before.analysis_results?.filter(a => a.change_detected).length || 0;
        const afterChanges = after.analysis_results?.filter(a => a.change_detected).length || 0;
        return {
            expansion_detected: afterChanges > beforeChanges,
            new_structures: Math.max(0, afterChanges - beforeChanges)
        };
    }
}
exports.SatelliteImageryAnalyzer = SatelliteImageryAnalyzer;
class SeismicDetectionSystem {
    events = [];
    recordEvent(event) {
        this.events.push(event);
    }
    identifyNuclearTests() {
        return this.events.filter(e => e.event_type === 'nuclear_test' ||
            (e.magnitude >= 4.0 && e.depth_km < 5 && e.event_type === 'explosion'));
    }
    estimateYield(magnitude) {
        // Murphy's formula: mb = 4.45 + 0.75 * log10(yield)
        const log_yield = (magnitude - 4.45) / 0.75;
        const yield_kt = Math.pow(10, log_yield);
        return {
            yield_kt,
            uncertainty: yield_kt * 0.5 // ±50% uncertainty
        };
    }
}
exports.SeismicDetectionSystem = SeismicDetectionSystem;
class RadionuclideMonitor {
    detections = [];
    recordDetection(detection) {
        this.detections.push(detection);
    }
    analyzeIsotopeRatio(detection) {
        const isotopes = detection.isotopes.map(i => i.isotope);
        // Weapon test indicators
        if (isotopes.includes('Xe-133') && isotopes.includes('Kr-85')) {
            return { likely_source: 'weapon_test', confidence: 0.8 };
        }
        // Reactor indicators
        if (isotopes.includes('I-131') || isotopes.includes('Cs-137')) {
            return { likely_source: 'reactor', confidence: 0.7 };
        }
        return { likely_source: 'unknown', confidence: 0.3 };
    }
    getDetectionsByPeriod(startDate, endDate) {
        return this.detections.filter(d => {
            const date = new Date(d.detection_date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    }
}
exports.RadionuclideMonitor = RadionuclideMonitor;
class OSINTAnalyzer {
    analyzeTechnicalPublication(publication) {
        const sensitiveKeywords = [
            'enrichment', 'plutonium', 'warhead', 'reprocessing',
            'centrifuge', 'uranium hexafluoride', 'weapon design'
        ];
        const concerns = [];
        publication.keywords.forEach(kw => {
            if (sensitiveKeywords.some(sk => kw.toLowerCase().includes(sk))) {
                concerns.push(kw);
            }
        });
        return {
            proliferation_concern: concerns.length > 0,
            concern_areas: concerns,
            risk_level: concerns.length >= 3 ? 'high' : concerns.length > 0 ? 'medium' : 'low'
        };
    }
    trackProcurementPatterns(purchases) {
        const dualUseItems = ['vacuum pumps', 'maraging steel', 'frequency converters'];
        const patterns = [];
        const itemCounts = purchases.reduce((acc, p) => {
            acc[p.item] = (acc[p.item] || 0) + 1;
            return acc;
        }, {});
        Object.entries(itemCounts).forEach(([item, count]) => {
            if (dualUseItems.some(du => item.includes(du)) && count > 5) {
                patterns.push(`Repeated purchases of ${item}: ${count} times`);
            }
        });
        return {
            suspicious: patterns.length > 0,
            patterns
        };
    }
}
exports.OSINTAnalyzer = OSINTAnalyzer;
