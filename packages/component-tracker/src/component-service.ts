import {
  Component,
  BillOfMaterials,
  ComponentInventory,
} from '@intelgraph/supply-chain-types';

/**
 * Component availability status
 */
export interface ComponentAvailability {
  componentId: string;
  partNumber: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  locations: Array<{
    locationId: string;
    quantity: number;
    status: string;
  }>;
  leadTimeDays: number;
  alternatives: Array<{
    componentId: string;
    partNumber: string;
    substitutionRisk: 'low' | 'medium' | 'high';
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Price volatility analysis
 */
export interface PriceVolatility {
  componentId: string;
  currentPrice: number;
  historicalPrices: Array<{
    date: Date;
    price: number;
  }>;
  volatilityScore: number; // 0-100
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  priceChangePercent30Days: number;
  priceChangePercent90Days: number;
  forecast: Array<{
    date: Date;
    predictedPrice: number;
    confidence: number;
  }>;
}

/**
 * Obsolescence risk assessment
 */
export interface ObsolescenceRisk {
  componentId: string;
  partNumber: string;
  manufacturer: string;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative';
    weight: number;
  }>;
  estimatedEndOfLife?: Date;
  mitigationActions: string[];
  alternatives: string[];
}

/**
 * Component and material tracking service
 */
export class ComponentTracker {
  /**
   * Check component availability
   */
  async checkAvailability(
    componentId: string,
    requiredQuantity: number,
    inventory: ComponentInventory[],
    component: Component
  ): Promise<ComponentAvailability> {
    const componentInventory = inventory.filter(inv => inv.componentId === componentId);

    const totalQuantity = componentInventory.reduce((sum, inv) => sum + inv.quantity, 0);
    const availableQuantity = componentInventory
      .filter(inv => inv.status === 'available')
      .reduce((sum, inv) => sum + inv.quantity, 0);
    const reservedQuantity = componentInventory
      .filter(inv => inv.status === 'reserved')
      .reduce((sum, inv) => sum + inv.quantity, 0);
    const inTransitQuantity = componentInventory
      .filter(inv => inv.status === 'in-transit')
      .reduce((sum, inv) => sum + inv.quantity, 0);

    const locations = componentInventory.map(inv => ({
      locationId: inv.locationId,
      quantity: inv.quantity,
      status: inv.status,
    }));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    const availabilityRatio = availableQuantity / requiredQuantity;

    if (availabilityRatio >= 2) {
      riskLevel = 'low';
    } else if (availabilityRatio >= 1) {
      riskLevel = 'medium';
    } else if (availabilityRatio >= 0.5) {
      riskLevel = 'high';
    } else {
      riskLevel = 'critical';
    }

    // Get alternatives
    const alternatives = (component.alternativeComponents || []).map(altId => ({
      componentId: altId,
      partNumber: `ALT-${altId.substring(0, 8)}`,
      substitutionRisk: 'medium' as const,
    }));

    return {
      componentId,
      partNumber: component.partNumber,
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      inTransitQuantity,
      locations,
      leadTimeDays: component.leadTimeDays || 30,
      alternatives,
      riskLevel,
    };
  }

  /**
   * Analyze price volatility
   */
  analyzePriceVolatility(
    componentId: string,
    historicalPrices: Array<{ date: Date; price: number }>
  ): PriceVolatility {
    if (historicalPrices.length === 0) {
      return {
        componentId,
        currentPrice: 0,
        historicalPrices: [],
        volatilityScore: 0,
        trend: 'stable',
        priceChangePercent30Days: 0,
        priceChangePercent90Days: 0,
        forecast: [],
      };
    }

    const sortedPrices = [...historicalPrices].sort((a, b) => b.date.getTime() - a.date.getTime());
    const currentPrice = sortedPrices[0].price;

    // Calculate price changes
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const price30DaysAgo = sortedPrices.find(p => p.date <= thirtyDaysAgo)?.price || currentPrice;
    const price90DaysAgo = sortedPrices.find(p => p.date <= ninetyDaysAgo)?.price || currentPrice;

    const change30Days = ((currentPrice - price30DaysAgo) / price30DaysAgo) * 100;
    const change90Days = ((currentPrice - price90DaysAgo) / price90DaysAgo) * 100;

    // Calculate volatility (standard deviation)
    const prices = sortedPrices.map(p => p.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatilityScore = Math.min(100, (stdDev / avgPrice) * 100);

    // Determine trend
    let trend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
    if (volatilityScore > 20) {
      trend = 'volatile';
    } else if (change30Days > 5) {
      trend = 'increasing';
    } else if (change30Days < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Simple forecast (linear regression)
    const forecast = this.forecastPrices(sortedPrices, 90);

    return {
      componentId,
      currentPrice,
      historicalPrices: sortedPrices,
      volatilityScore,
      trend,
      priceChangePercent30Days: change30Days,
      priceChangePercent90Days: change90Days,
      forecast,
    };
  }

  /**
   * Assess obsolescence risk
   */
  assessObsolescence(component: Component): ObsolescenceRisk {
    const factors: Array<{
      factor: string;
      impact: 'positive' | 'negative';
      weight: number;
    }> = [];

    let riskScore = 0;

    // Check if component is marked for obsolescence
    if (component.obsolescenceRisk === 'high') {
      riskScore += 40;
      factors.push({
        factor: 'Marked as high obsolescence risk',
        impact: 'negative',
        weight: 40,
      });
    } else if (component.obsolescenceRisk === 'medium') {
      riskScore += 20;
      factors.push({
        factor: 'Marked as medium obsolescence risk',
        impact: 'negative',
        weight: 20,
      });
    }

    // Check if component is controlled (export control can indicate older tech)
    if (component.isControlled) {
      riskScore += 10;
      factors.push({
        factor: 'Export controlled component',
        impact: 'negative',
        weight: 10,
      });
    }

    // Check for alternatives availability
    if (component.alternativeComponents && component.alternativeComponents.length > 0) {
      factors.push({
        factor: `${component.alternativeComponents.length} alternative components available`,
        impact: 'positive',
        weight: -10,
      });
    } else {
      riskScore += 15;
      factors.push({
        factor: 'No alternative components identified',
        impact: 'negative',
        weight: 15,
      });
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 25) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate mitigation actions
    const mitigationActions: string[] = [];
    if (riskLevel === 'high') {
      mitigationActions.push('Identify and qualify alternative components immediately');
      mitigationActions.push('Build strategic inventory (last-time buy)');
      mitigationActions.push('Engage with manufacturer for extended support');
    } else if (riskLevel === 'medium') {
      mitigationActions.push('Monitor manufacturer announcements');
      mitigationActions.push('Begin alternative component qualification');
    } else {
      mitigationActions.push('Continue regular monitoring');
    }

    return {
      componentId: component.id,
      partNumber: component.partNumber,
      manufacturer: component.manufacturer || 'Unknown',
      riskLevel,
      factors,
      mitigationActions,
      alternatives: component.alternativeComponents || [],
    };
  }

  /**
   * Track component through supply chain
   */
  async trackComponent(
    componentId: string,
    serialNumber?: string
  ): Promise<{
    componentId: string;
    partNumber: string;
    serialNumber?: string;
    currentLocation: string;
    status: string;
    history: Array<{
      timestamp: Date;
      location: string;
      event: string;
      actor: string;
    }>;
  }> {
    // Placeholder - would integrate with tracking systems
    return {
      componentId,
      partNumber: `PART-${componentId.substring(0, 8)}`,
      serialNumber,
      currentLocation: 'Warehouse A',
      status: 'In Stock',
      history: [
        {
          timestamp: new Date(),
          location: 'Warehouse A',
          event: 'Received',
          actor: 'System',
        },
      ],
    };
  }

  /**
   * Detect counterfeit components
   */
  async detectCounterfeit(
    componentId: string,
    serialNumber: string,
    verificationData: {
      manufacturerCode?: string;
      batchNumber?: string;
      qrCode?: string;
      rfidData?: string;
    }
  ): Promise<{
    authentic: boolean;
    confidence: number;
    checks: Array<{
      check: string;
      passed: boolean;
      details: string;
    }>;
    recommendation: string;
  }> {
    const checks: Array<{
      check: string;
      passed: boolean;
      details: string;
    }> = [];

    let passedChecks = 0;
    const totalChecks = 4;

    // Serial number format check
    const serialValid = this.validateSerialNumber(serialNumber);
    checks.push({
      check: 'Serial Number Format',
      passed: serialValid,
      details: serialValid ? 'Valid format' : 'Invalid format',
    });
    if (serialValid) passedChecks++;

    // Manufacturer code check
    if (verificationData.manufacturerCode) {
      const codeValid = this.validateManufacturerCode(verificationData.manufacturerCode);
      checks.push({
        check: 'Manufacturer Code',
        passed: codeValid,
        details: codeValid ? 'Valid code' : 'Invalid or unknown code',
      });
      if (codeValid) passedChecks++;
    }

    // Batch number check
    if (verificationData.batchNumber) {
      const batchValid = this.validateBatchNumber(verificationData.batchNumber);
      checks.push({
        check: 'Batch Number',
        passed: batchValid,
        details: batchValid ? 'Valid batch' : 'Unknown batch',
      });
      if (batchValid) passedChecks++;
    }

    // RFID authentication
    if (verificationData.rfidData) {
      const rfidValid = this.validateRFID(verificationData.rfidData);
      checks.push({
        check: 'RFID Authentication',
        passed: rfidValid,
        details: rfidValid ? 'Authenticated' : 'Authentication failed',
      });
      if (rfidValid) passedChecks++;
    }

    const confidence = (passedChecks / totalChecks) * 100;
    const authentic = confidence >= 75;

    let recommendation: string;
    if (authentic) {
      recommendation = 'Component appears authentic - approved for use';
    } else if (confidence >= 50) {
      recommendation = 'Uncertain authenticity - additional verification recommended';
    } else {
      recommendation = 'High risk of counterfeit - quarantine and investigate';
    }

    return {
      authentic,
      confidence,
      checks,
      recommendation,
    };
  }

  // Private helper methods

  private forecastPrices(
    historicalPrices: Array<{ date: Date; price: number }>,
    daysAhead: number
  ): Array<{ date: Date; predictedPrice: number; confidence: number }> {
    if (historicalPrices.length < 2) return [];

    // Simple linear regression
    const n = historicalPrices.length;
    const baseTime = historicalPrices[0].date.getTime();
    const xValues = historicalPrices.map(p => (p.date.getTime() - baseTime) / (1000 * 60 * 60 * 24));
    const yValues = historicalPrices.map(p => p.price);

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecast: Array<{ date: Date; predictedPrice: number; confidence: number }> = [];
    for (let i = 1; i <= daysAhead; i += 30) {
      const x = xValues[xValues.length - 1] + i;
      const predictedPrice = slope * x + intercept;
      const confidence = Math.max(0, 100 - i / 3); // Confidence decreases with time

      forecast.push({
        date: new Date(baseTime + x * 24 * 60 * 60 * 1000),
        predictedPrice: Math.max(0, predictedPrice),
        confidence,
      });
    }

    return forecast;
  }

  private validateSerialNumber(serialNumber: string): boolean {
    // Placeholder validation
    return serialNumber.length >= 8 && /^[A-Z0-9-]+$/.test(serialNumber);
  }

  private validateManufacturerCode(code: string): boolean {
    // Placeholder validation
    return code.length >= 3;
  }

  private validateBatchNumber(batchNumber: string): boolean {
    // Placeholder validation
    return batchNumber.length >= 4;
  }

  private validateRFID(rfidData: string): boolean {
    // Placeholder validation
    return rfidData.length >= 16;
  }
}
