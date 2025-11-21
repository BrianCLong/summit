/**
 * Technical Analysis Package
 *
 * Advanced technical analysis capabilities including satellite imagery,
 * seismic detection, radionuclide monitoring, and OSINT analysis.
 */

export * from './types.js';
export * from './satellite-imagery.js';
export * from './seismic-detection.js';
export * from './radionuclide-monitoring.js';
export * from './osint-analyzer.js';

export interface SatelliteImage {
  id: string;
  facility_id?: string;
  location: { latitude: number; longitude: number };
  capture_date: string;
  resolution_m: number;
  sensor_type: 'optical' | 'sar' | 'multispectral' | 'hyperspectral';
  cloud_cover_percent?: number;
  analysis_results?: ImageAnalysis[];
}

export interface ImageAnalysis {
  analysis_type: string;
  findings: string[];
  change_detected: boolean;
  confidence: number;
  analyst_notes?: string;
}

export interface SeismicEvent {
  id: string;
  location: { latitude: number; longitude: number };
  timestamp: string;
  magnitude: number;
  magnitude_type: 'mb' | 'Ms' | 'Mw';
  depth_km: number;
  event_type: 'earthquake' | 'explosion' | 'nuclear_test' | 'unknown';
  confidence: number;
  stations_detected: number;
}

export interface RadionuclideDetection {
  id: string;
  station_id: string;
  location: { latitude: number; longitude: number };
  detection_date: string;
  isotopes: IsotopeDetection[];
  source_estimate?: { latitude: number; longitude: number };
  event_type: 'nuclear_test' | 'accident' | 'medical' | 'industrial' | 'unknown';
}

export interface IsotopeDetection {
  isotope: string;
  half_life: string;
  concentration: number;
  unit: string;
  significance: 'high' | 'medium' | 'low';
}

export class SatelliteImageryAnalyzer {
  analyzeConstruction(images: SatelliteImage[]): {
    construction_detected: boolean;
    timeline: Array<{ date: string; progress: number }>;
  } {
    const sorted = images.sort((a, b) =>
      new Date(a.capture_date).getTime() - new Date(b.capture_date).getTime()
    );

    const construction = sorted.some(img =>
      img.analysis_results?.some(a => a.change_detected)
    );

    return {
      construction_detected: construction,
      timeline: sorted.map(img => ({
        date: img.capture_date,
        progress: img.analysis_results?.[0]?.confidence || 0
      }))
    };
  }

  detectFacilityExpansion(before: SatelliteImage, after: SatelliteImage): {
    expansion_detected: boolean;
    area_change_percent?: number;
    new_structures: number;
  } {
    // Simplified - in reality this would use computer vision
    const beforeChanges = before.analysis_results?.filter(a => a.change_detected).length || 0;
    const afterChanges = after.analysis_results?.filter(a => a.change_detected).length || 0;

    return {
      expansion_detected: afterChanges > beforeChanges,
      new_structures: Math.max(0, afterChanges - beforeChanges)
    };
  }
}

export class SeismicDetectionSystem {
  private events: SeismicEvent[] = [];

  recordEvent(event: SeismicEvent): void {
    this.events.push(event);
  }

  identifyNuclearTests(): SeismicEvent[] {
    return this.events.filter(e =>
      e.event_type === 'nuclear_test' ||
      (e.magnitude >= 4.0 && e.depth_km < 5 && e.event_type === 'explosion')
    );
  }

  estimateYield(magnitude: number): { yield_kt: number; uncertainty: number } {
    // Murphy's formula: mb = 4.45 + 0.75 * log10(yield)
    const log_yield = (magnitude - 4.45) / 0.75;
    const yield_kt = Math.pow(10, log_yield);

    return {
      yield_kt,
      uncertainty: yield_kt * 0.5 // ±50% uncertainty
    };
  }
}

export class RadionuclideMonitor {
  private detections: RadionuclideDetection[] = [];

  recordDetection(detection: RadionuclideDetection): void {
    this.detections.push(detection);
  }

  analyzeIsotopeRatio(detection: RadionuclideDetection): {
    likely_source: 'weapon_test' | 'reactor' | 'medical' | 'unknown';
    confidence: number;
  } {
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

  getDetectionsByPeriod(startDate: string, endDate: string): RadionuclideDetection[] {
    return this.detections.filter(d => {
      const date = new Date(d.detection_date);
      return date >= new Date(startDate) && date <= new Date(endDate);
    });
  }
}

export class OSINTAnalyzer {
  analyzeTechnicalPublication(publication: {
    title: string;
    authors: string[];
    institution: string;
    country: string;
    keywords: string[];
  }): {
    proliferation_concern: boolean;
    concern_areas: string[];
    risk_level: 'high' | 'medium' | 'low';
  } {
    const sensitiveKeywords = [
      'enrichment', 'plutonium', 'warhead', 'reprocessing',
      'centrifuge', 'uranium hexafluoride', 'weapon design'
    ];

    const concerns: string[] = [];
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

  trackProcurementPatterns(purchases: Array<{
    item: string;
    quantity: number;
    buyer: string;
    date: string;
  }>): { suspicious: boolean; patterns: string[] } {
    const dualUseItems = ['vacuum pumps', 'maraging steel', 'frequency converters'];
    const patterns: string[] = [];

    const itemCounts = purchases.reduce((acc, p) => {
      acc[p.item] = (acc[p.item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
