import {
  Shipment,
  ShipmentStatus,
  CarrierPerformance,
  GeographicLocation,
} from '@intelgraph/supply-chain-types';

/**
 * Real-time shipment tracking data
 */
export interface ShipmentTracking {
  shipmentId: string;
  trackingNumber: string;
  currentStatus: ShipmentStatus;
  currentLocation: GeographicLocation;
  lastUpdate: Date;
  estimatedArrival: Date;
  delays: Array<{
    reason: string;
    delayHours: number;
    detectedAt: Date;
  }>;
  alerts: Array<{
    type: 'temperature' | 'delay' | 'route-deviation' | 'damage' | 'security';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  nextMilestone: {
    event: string;
    location: string;
    estimatedTime: Date;
  };
}

/**
 * Route optimization result
 */
export interface RouteOptimization {
  origin: GeographicLocation;
  destination: GeographicLocation;
  recommendedRoute: {
    mode: 'air' | 'sea' | 'rail' | 'road' | 'multimodal';
    carriers: string[];
    estimatedDays: number;
    estimatedCost: number;
    carbonEmissions: number;
    reliability: number; // 0-1
    riskScore: number; // 0-100
  };
  alternativeRoutes: Array<{
    mode: 'air' | 'sea' | 'rail' | 'road' | 'multimodal';
    carriers: string[];
    estimatedDays: number;
    estimatedCost: number;
    carbonEmissions: number;
    reliability: number;
    riskScore: number;
    tradeoffs: string[];
  }>;
}

/**
 * Port congestion monitoring
 */
export interface PortCongestion {
  portName: string;
  location: GeographicLocation;
  congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
  averageWaitTimeDays: number;
  vesselBacklog: number;
  trend: 'improving' | 'stable' | 'worsening';
  affectedShipments: number;
  lastUpdated: Date;
  forecast: Array<{
    date: Date;
    predictedCongestion: 'low' | 'moderate' | 'high' | 'severe';
  }>;
}

/**
 * Transportation mode analysis
 */
export interface TransportModeAnalysis {
  mode: 'air' | 'sea' | 'rail' | 'road' | 'multimodal';
  usage: {
    totalShipments: number;
    totalValue: number;
    averageCost: number;
    averageTransitDays: number;
  };
  performance: {
    onTimeRate: number;
    damageRate: number;
    lossRate: number;
  };
  costs: {
    averageCostPerKg: number;
    averageCostPerShipment: number;
    totalCost: number;
  };
  environmental: {
    totalEmissions: number;
    emissionsPerKg: number;
  };
  recommendation: string;
}

/**
 * Logistics intelligence and transportation tracking
 */
export class LogisticsTracker {
  /**
   * Track shipment in real-time
   */
  async trackShipment(trackingNumber: string): Promise<ShipmentTracking> {
    // Placeholder - would integrate with carrier APIs
    const now = new Date();
    const estimatedArrival = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    return {
      shipmentId: crypto.randomUUID(),
      trackingNumber,
      currentStatus: 'in-transit',
      currentLocation: {
        country: 'United States',
        city: 'Los Angeles',
        latitude: 34.0522,
        longitude: -118.2437,
      },
      lastUpdate: now,
      estimatedArrival,
      delays: [],
      alerts: [],
      nextMilestone: {
        event: 'Arrival at destination port',
        location: 'Port of Oakland',
        estimatedTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    };
  }

  /**
   * Optimize route selection
   */
  optimizeRoute(
    origin: GeographicLocation,
    destination: GeographicLocation,
    requirements: {
      maxCost?: number;
      maxDays?: number;
      minReliability?: number;
      prioritizeCost?: boolean;
      prioritizeSpeed?: boolean;
      prioritizeEnvironmental?: boolean;
    }
  ): RouteOptimization {
    // Calculate distance (simplified)
    const distance = this.calculateDistance(origin, destination);

    // Generate route options
    const airRoute = {
      mode: 'air' as const,
      carriers: ['FedEx', 'UPS', 'DHL'],
      estimatedDays: Math.ceil(distance / 5000) + 1,
      estimatedCost: distance * 2.5,
      carbonEmissions: distance * 0.5,
      reliability: 0.95,
      riskScore: 15,
    };

    const seaRoute = {
      mode: 'sea' as const,
      carriers: ['Maersk', 'MSC', 'CMA CGM'],
      estimatedDays: Math.ceil(distance / 500) + 5,
      estimatedCost: distance * 0.1,
      carbonEmissions: distance * 0.02,
      reliability: 0.85,
      riskScore: 35,
    };

    const railRoute = {
      mode: 'rail' as const,
      carriers: ['Union Pacific', 'BNSF'],
      estimatedDays: Math.ceil(distance / 800) + 2,
      estimatedCost: distance * 0.3,
      carbonEmissions: distance * 0.03,
      reliability: 0.90,
      riskScore: 20,
    };

    const roadRoute = {
      mode: 'road' as const,
      carriers: ['J.B. Hunt', 'Schneider'],
      estimatedDays: Math.ceil(distance / 600) + 1,
      estimatedCost: distance * 0.5,
      carbonEmissions: distance * 0.15,
      reliability: 0.88,
      riskScore: 25,
    };

    // Select recommended route based on priorities
    let recommended = seaRoute;
    let alternatives = [airRoute, railRoute, roadRoute];

    if (requirements.prioritizeSpeed) {
      recommended = airRoute;
      alternatives = [railRoute, roadRoute, seaRoute];
    } else if (requirements.prioritizeCost) {
      recommended = seaRoute;
      alternatives = [railRoute, roadRoute, airRoute];
    } else if (requirements.prioritizeEnvironmental) {
      recommended = seaRoute;
      alternatives = [railRoute, roadRoute, airRoute];
    }

    return {
      origin,
      destination,
      recommendedRoute: recommended,
      alternativeRoutes: alternatives.map(route => ({
        ...route,
        tradeoffs: this.generateTradeoffs(route, recommended),
      })),
    };
  }

  /**
   * Monitor port congestion
   */
  async monitorPortCongestion(portName: string): Promise<PortCongestion> {
    // Placeholder - would integrate with port authority APIs
    const congestionLevel = this.calculateCongestionLevel(portName);

    return {
      portName,
      location: {
        country: 'United States',
        city: 'Los Angeles',
        latitude: 33.7405,
        longitude: -118.2717,
      },
      congestionLevel,
      averageWaitTimeDays: congestionLevel === 'severe' ? 10 : congestionLevel === 'high' ? 5 : 2,
      vesselBacklog: congestionLevel === 'severe' ? 50 : congestionLevel === 'high' ? 25 : 10,
      trend: 'stable',
      affectedShipments: 0,
      lastUpdated: new Date(),
      forecast: this.generateCongestionForecast(congestionLevel),
    };
  }

  /**
   * Evaluate carrier performance
   */
  evaluateCarrier(
    carrierId: string,
    shipments: Shipment[]
  ): CarrierPerformance {
    const carrierShipments = shipments.filter(s => s.carrier === carrierId);

    if (carrierShipments.length === 0) {
      return {
        carrierId,
        carrierName: carrierId,
        period: {
          start: new Date(),
          end: new Date(),
        },
        metrics: {
          onTimeDeliveryRate: 0,
          damageRate: 0,
          lossRate: 0,
          averageDelayDays: 0,
          totalShipments: 0,
          successfulDeliveries: 0,
        },
        score: 0,
        lastUpdated: new Date(),
      };
    }

    // Calculate metrics
    const delivered = carrierShipments.filter(s => s.status === 'delivered');
    const damaged = carrierShipments.filter(s => s.status === 'damaged');
    const lost = carrierShipments.filter(s => s.status === 'lost');

    const onTime = delivered.filter(s => {
      if (!s.actualArrival) return false;
      return s.actualArrival <= s.estimatedArrival;
    });

    const delays = delivered
      .filter(s => s.actualArrival && s.actualArrival > s.estimatedArrival)
      .map(s => {
        const delay = (s.actualArrival!.getTime() - s.estimatedArrival.getTime()) / (1000 * 60 * 60 * 24);
        return delay;
      });

    const avgDelay = delays.length > 0 ? delays.reduce((sum, d) => sum + d, 0) / delays.length : 0;

    const metrics = {
      onTimeDeliveryRate: delivered.length > 0 ? onTime.length / delivered.length : 0,
      damageRate: carrierShipments.length > 0 ? damaged.length / carrierShipments.length : 0,
      lossRate: carrierShipments.length > 0 ? lost.length / carrierShipments.length : 0,
      averageDelayDays: avgDelay,
      totalShipments: carrierShipments.length,
      successfulDeliveries: delivered.length,
    };

    // Calculate score
    const score = this.calculateCarrierScore(metrics);

    return {
      carrierId,
      carrierName: carrierId,
      period: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      metrics,
      score,
      lastUpdated: new Date(),
    };
  }

  /**
   * Analyze transportation mode usage and performance
   */
  analyzeTransportMode(
    mode: 'air' | 'sea' | 'rail' | 'road' | 'multimodal',
    shipments: Shipment[]
  ): TransportModeAnalysis {
    const modeShipments = shipments.filter(s => s.transportMode === mode);

    if (modeShipments.length === 0) {
      return {
        mode,
        usage: {
          totalShipments: 0,
          totalValue: 0,
          averageCost: 0,
          averageTransitDays: 0,
        },
        performance: {
          onTimeRate: 0,
          damageRate: 0,
          lossRate: 0,
        },
        costs: {
          averageCostPerKg: 0,
          averageCostPerShipment: 0,
          totalCost: 0,
        },
        environmental: {
          totalEmissions: 0,
          emissionsPerKg: 0,
        },
        recommendation: 'Insufficient data for recommendation',
      };
    }

    // Calculate usage metrics
    const totalValue = modeShipments.reduce((sum, s) => {
      return sum + s.contents.reduce((cSum, c) => cSum + (c.value || 0), 0);
    }, 0);

    const transitTimes = modeShipments
      .filter(s => s.actualArrival && s.actualDeparture)
      .map(s => {
        const transit = (s.actualArrival!.getTime() - s.actualDeparture!.getTime()) / (1000 * 60 * 60 * 24);
        return transit;
      });

    const avgTransitDays = transitTimes.length > 0
      ? transitTimes.reduce((sum, t) => sum + t, 0) / transitTimes.length
      : 0;

    // Calculate performance
    const delivered = modeShipments.filter(s => s.status === 'delivered');
    const onTime = delivered.filter(s => {
      if (!s.actualArrival) return false;
      return s.actualArrival <= s.estimatedArrival;
    });
    const damaged = modeShipments.filter(s => s.status === 'damaged');
    const lost = modeShipments.filter(s => s.status === 'lost');

    // Estimate costs and emissions (placeholder values)
    const avgCostPerShipment = this.estimateCostByMode(mode);
    const emissionsPerKg = this.estimateEmissionsByMode(mode);

    let recommendation = '';
    if (mode === 'air') {
      recommendation = 'Fastest option but highest cost and emissions. Best for urgent, high-value shipments.';
    } else if (mode === 'sea') {
      recommendation = 'Most cost-effective and lowest emissions. Best for large volumes with flexible timelines.';
    } else if (mode === 'rail') {
      recommendation = 'Good balance of cost, speed, and emissions. Best for continental transport.';
    } else if (mode === 'road') {
      recommendation = 'Flexible and reliable for short-medium distances. Best for last-mile delivery.';
    }

    return {
      mode,
      usage: {
        totalShipments: modeShipments.length,
        totalValue,
        averageCost: avgCostPerShipment,
        averageTransitDays: avgTransitDays,
      },
      performance: {
        onTimeRate: delivered.length > 0 ? onTime.length / delivered.length : 0,
        damageRate: modeShipments.length > 0 ? damaged.length / modeShipments.length : 0,
        lossRate: modeShipments.length > 0 ? lost.length / modeShipments.length : 0,
      },
      costs: {
        averageCostPerKg: avgCostPerShipment / 100, // Assume 100kg average
        averageCostPerShipment: avgCostPerShipment,
        totalCost: avgCostPerShipment * modeShipments.length,
      },
      environmental: {
        totalEmissions: emissionsPerKg * 100 * modeShipments.length,
        emissionsPerKg,
      },
      recommendation,
    };
  }

  // Private helper methods

  private calculateDistance(origin: GeographicLocation, destination: GeographicLocation): number {
    // Simplified distance calculation
    if (!origin.latitude || !origin.longitude || !destination.latitude || !destination.longitude) {
      return 5000; // Default distance
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(destination.latitude - origin.latitude);
    const dLon = this.toRad(destination.longitude - origin.longitude);
    const lat1 = this.toRad(origin.latitude);
    const lat2 = this.toRad(destination.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private generateTradeoffs(
    route: any,
    recommended: any
  ): string[] {
    const tradeoffs: string[] = [];

    if (route.estimatedDays > recommended.estimatedDays) {
      tradeoffs.push(`+${route.estimatedDays - recommended.estimatedDays} days transit time`);
    } else if (route.estimatedDays < recommended.estimatedDays) {
      tradeoffs.push(`-${recommended.estimatedDays - route.estimatedDays} days transit time`);
    }

    if (route.estimatedCost > recommended.estimatedCost) {
      tradeoffs.push(`+$${(route.estimatedCost - recommended.estimatedCost).toFixed(2)} cost`);
    } else if (route.estimatedCost < recommended.estimatedCost) {
      tradeoffs.push(`-$${(recommended.estimatedCost - route.estimatedCost).toFixed(2)} cost`);
    }

    if (route.carbonEmissions > recommended.carbonEmissions) {
      tradeoffs.push(`+${(route.carbonEmissions - recommended.carbonEmissions).toFixed(2)} kg CO2`);
    } else if (route.carbonEmissions < recommended.carbonEmissions) {
      tradeoffs.push(`-${(recommended.carbonEmissions - route.carbonEmissions).toFixed(2)} kg CO2`);
    }

    return tradeoffs;
  }

  private calculateCongestionLevel(portName: string): 'low' | 'moderate' | 'high' | 'severe' {
    // Placeholder - would use real port data
    const random = Math.random();
    if (random < 0.25) return 'low';
    if (random < 0.5) return 'moderate';
    if (random < 0.75) return 'high';
    return 'severe';
  }

  private generateCongestionForecast(
    currentLevel: 'low' | 'moderate' | 'high' | 'severe'
  ): Array<{ date: Date; predictedCongestion: 'low' | 'moderate' | 'high' | 'severe' }> {
    const forecast: Array<{ date: Date; predictedCongestion: 'low' | 'moderate' | 'high' | 'severe' }> = [];
    const levels: ('low' | 'moderate' | 'high' | 'severe')[] = ['low', 'moderate', 'high', 'severe'];
    let currentLevelIndex = levels.indexOf(currentLevel);

    for (let i = 1; i <= 30; i += 7) {
      // Random walk with mean reversion
      const change = Math.random() < 0.5 ? -1 : 1;
      currentLevelIndex = Math.max(0, Math.min(3, currentLevelIndex + change));

      forecast.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predictedCongestion: levels[currentLevelIndex],
      });
    }

    return forecast;
  }

  private calculateCarrierScore(metrics: CarrierPerformance['metrics']): number {
    let score = 0;

    // On-time delivery (40 points)
    score += metrics.onTimeDeliveryRate * 40;

    // Low damage rate (30 points)
    score += (1 - metrics.damageRate) * 30;

    // Low loss rate (30 points)
    score += (1 - metrics.lossRate) * 30;

    return Math.min(100, score);
  }

  private estimateCostByMode(mode: 'air' | 'sea' | 'rail' | 'road' | 'multimodal'): number {
    const costs = {
      air: 5000,
      sea: 1000,
      rail: 1500,
      road: 2000,
      multimodal: 1800,
    };
    return costs[mode];
  }

  private estimateEmissionsByMode(mode: 'air' | 'sea' | 'rail' | 'road' | 'multimodal'): number {
    const emissions = {
      air: 0.5,
      sea: 0.02,
      rail: 0.03,
      road: 0.15,
      multimodal: 0.08,
    };
    return emissions[mode];
  }
}
