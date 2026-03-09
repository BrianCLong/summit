/**
 * Observability 3.0 - Causal SLO Budgets & Carbon Bands
 * Turn SLOs and carbon into budgets with causal attributions
 */

import { EventEmitter } from 'events';

export interface SLODefinition {
  id: string;
  name: string;
  service: string;
  metric: string;
  threshold: number;
  window: string; // e.g., "30d", "7d", "1h"
  budget: number; // Error budget percentage
  alertThreshold: number; // When to alert (e.g., 0.1 = 10% budget consumed)
}

export interface SLOBurnRate {
  sloId: string;
  currentBurn: number;
  budgetRemaining: number;
  projectedExhaustion: number; // timestamp when budget will be exhausted
  severity: 'ok' | 'warning' | 'critical';
}

export interface CarbonIntensity {
  region: string;
  timestamp: number;
  gCO2PerKWh: number;
  band: 'green' | 'amber' | 'red';
  forecast: Array<{
    timestamp: number;
    intensity: number;
    band: 'green' | 'amber' | 'red';
  }>;
}

export interface CausalAttribution {
  component: string;
  sloId: string;
  burnContribution: number;
  changeCorrelation: number;
  recommendedBudget: number;
  confidence: number;
}

export interface CarbonOptimization {
  jobId: string;
  originalSchedule: number;
  optimizedSchedule: number;
  carbonSavings: number;
  delayCost: number;
  urgent: boolean;
}

export class ObservabilityEngine extends EventEmitter {
  private slos: Map<string, SLODefinition> = new Map();
  private sloBurnRates: Map<string, SLOBurnRate> = new Map();
  private carbonIntensity: Map<string, CarbonIntensity> = new Map();
  private causalAttributions: Map<string, CausalAttribution[]> = new Map();
  private carbonOptimizations: CarbonOptimization[] = [];
  private historicalData: Map<
    string,
    Array<{ timestamp: number; value: number }>
  > = new Map();

  constructor() {
    super();
    this.initializeSLOs();
    this.initializeCarbonData();
    this.startMonitoring();
  }

  private initializeSLOs(): void {
    // API Latency SLO
    this.slos.set('api-latency-p95', {
      id: 'api-latency-p95',
      name: 'API Latency P95',
      service: 'api-gateway',
      metric: 'latency_p95_ms',
      threshold: 250, // 250ms
      window: '30d',
      budget: 1.0, // 1% error budget
      alertThreshold: 0.1, // Alert when 10% of budget consumed
    });

    // Error Rate SLO
    this.slos.set('api-error-rate', {
      id: 'api-error-rate',
      name: 'API Error Rate',
      service: 'api-gateway',
      metric: 'error_rate',
      threshold: 0.001, // 0.1%
      window: '30d',
      budget: 0.5, // 0.5% error budget
      alertThreshold: 0.2,
    });

    // Availability SLO
    this.slos.set('service-availability', {
      id: 'service-availability',
      name: 'Service Availability',
      service: 'core-services',
      metric: 'availability',
      threshold: 0.999, // 99.9%
      window: '30d',
      budget: 0.1, // 0.1% error budget
      alertThreshold: 0.05,
    });

    // Initialize burn rate tracking
    for (const [sloId, slo] of this.slos) {
      this.sloBurnRates.set(sloId, {
        sloId,
        currentBurn: 0,
        budgetRemaining: slo.budget,
        projectedExhaustion: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        severity: 'ok',
      });
    }
  }

  private initializeCarbonData(): void {
    // Initialize carbon intensity data for different regions
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

    for (const region of regions) {
      const baseIntensity = this.getBaseIntensityForRegion(region);
      const intensity = baseIntensity + (Math.random() - 0.5) * 100; // Add some variation

      this.carbonIntensity.set(region, {
        region,
        timestamp: Date.now(),
        gCO2PerKWh: intensity,
        band: this.calculateCarbonBand(intensity),
        forecast: this.generateCarbonForecast(intensity),
      });
    }
  }

  private getBaseIntensityForRegion(region: string): number {
    // Approximate carbon intensities by region (gCO2/kWh)
    const intensities: Record<string, number> = {
      'us-east-1': 400, // Higher - coal/gas mix
      'us-west-2': 300, // Lower - hydro/wind
      'eu-west-1': 350, // Medium - mixed sources
      'ap-southeast-1': 500, // Higher - coal heavy
    };
    return intensities[region] || 400;
  }

  private calculateCarbonBand(intensity: number): 'green' | 'amber' | 'red' {
    if (intensity < 200) return 'green';
    if (intensity < 400) return 'amber';
    return 'red';
  }

  private generateCarbonForecast(currentIntensity: number): Array<{
    timestamp: number;
    intensity: number;
    band: 'green' | 'amber' | 'red';
  }> {
    const forecast = [];
    const now = Date.now();

    for (let i = 1; i <= 24; i++) {
      // 24 hour forecast
      const timestamp = now + i * 60 * 60 * 1000;

      // Simulate daily carbon intensity patterns
      const hourOfDay = new Date(timestamp).getHours();
      const dailyPattern = Math.sin((hourOfDay / 24) * 2 * Math.PI) * 50; // ±50 variation
      const randomVariation = (Math.random() - 0.5) * 100;

      const intensity = Math.max(
        50,
        currentIntensity + dailyPattern + randomVariation,
      );

      forecast.push({
        timestamp,
        intensity,
        band: this.calculateCarbonBand(intensity),
      });
    }

    return forecast;
  }

  private startMonitoring(): void {
    // Update SLO burn rates every minute
    setInterval(() => {
      this.updateSLOBurnRates();
    }, 60 * 1000);

    // Update carbon intensity every 15 minutes
    setInterval(
      () => {
        this.updateCarbonIntensity();
      },
      15 * 60 * 1000,
    );

    // Run causal attribution analysis every hour
    setInterval(
      () => {
        this.runCausalAttributionAnalysis();
      },
      60 * 60 * 1000,
    );
  }

  private updateSLOBurnRates(): void {
    for (const [sloId, slo] of this.slos) {
      const currentMetric = this.getCurrentMetricValue(slo);
      const burnRate = this.calculateBurnRate(slo, currentMetric);

      const currentBurn = this.sloBurnRates.get(sloId)!;
      currentBurn.currentBurn = burnRate;
      currentBurn.budgetRemaining = Math.max(
        0,
        currentBurn.budgetRemaining - burnRate / (24 * 60),
      ); // Per minute burn
      currentBurn.severity = this.calculateSeverity(currentBurn);

      if (currentBurn.budgetRemaining > 0) {
        const minutesToExhaustion =
          currentBurn.budgetRemaining / (burnRate / (24 * 60));
        currentBurn.projectedExhaustion =
          Date.now() + minutesToExhaustion * 60 * 1000;
      }

      if (currentBurn.severity !== 'ok') {
        this.emit('sloBudgetAlert', { sloId, burnRate: currentBurn });
      }
    }
  }

  private getCurrentMetricValue(slo: SLODefinition): number {
    // Simulate current metric values
    switch (slo.metric) {
      case 'latency_p95_ms':
        return 200 + Math.random() * 100; // 200-300ms
      case 'error_rate':
        return Math.random() * 0.002; // 0-0.2%
      case 'availability':
        return 0.999 - Math.random() * 0.001; // 99.8-99.9%
      default:
        return 0;
    }
  }

  private calculateBurnRate(slo: SLODefinition, currentValue: number): number {
    // Calculate how much error budget is being consumed
    let violation = 0;

    switch (slo.metric) {
      case 'latency_p95_ms':
        violation = Math.max(0, currentValue - slo.threshold) / slo.threshold;
        break;
      case 'error_rate':
        violation = Math.max(0, currentValue - slo.threshold) / slo.threshold;
        break;
      case 'availability':
        violation =
          Math.max(0, slo.threshold - currentValue) / (1 - slo.threshold);
        break;
    }

    return violation * 24; // Burn rate per hour * 24 = daily rate
  }

  private calculateSeverity(
    burnRate: SLOBurnRate,
  ): 'ok' | 'warning' | 'critical' {
    const budgetUsed =
      1 - burnRate.budgetRemaining / this.slos.get(burnRate.sloId)!.budget;

    if (budgetUsed > 0.8) return 'critical'; // 80% budget consumed
    if (budgetUsed > 0.5) return 'warning'; // 50% budget consumed
    return 'ok';
  }

  private updateCarbonIntensity(): void {
    for (const [region, data] of this.carbonIntensity) {
      // Update with new intensity reading
      const newIntensity =
        this.getBaseIntensityForRegion(region) + (Math.random() - 0.5) * 100;

      data.timestamp = Date.now();
      data.gCO2PerKWh = newIntensity;
      data.band = this.calculateCarbonBand(newIntensity);
      data.forecast = this.generateCarbonForecast(newIntensity);

      this.emit('carbonIntensityUpdated', {
        region,
        intensity: newIntensity,
        band: data.band,
      });
    }
  }

  /**
   * Run causal attribution analysis to determine which components are causing SLO burns
   */
  private async runCausalAttributionAnalysis(): Promise<void> {
    for (const [sloId, slo] of this.slos) {
      const attributions = await this.attributeSLOBurn(sloId);
      this.causalAttributions.set(sloId, attributions);

      // Recommend budget reallocation
      await this.recommendBudgetReallocation(sloId, attributions);
    }
  }

  private async attributeSLOBurn(sloId: string): Promise<CausalAttribution[]> {
    const slo = this.slos.get(sloId)!;
    const components = this.getComponentsForService(slo.service);
    const attributions: CausalAttribution[] = [];

    for (const component of components) {
      // Analyze correlation between component metrics and SLO burn
      const correlation = await this.calculateChangeCorrelation(
        component,
        sloId,
      );
      const burnContribution = await this.calculateBurnContribution(
        component,
        sloId,
      );
      const recommendedBudget =
        this.calculateRecommendedBudget(burnContribution);

      attributions.push({
        component,
        sloId,
        burnContribution,
        changeCorrelation: correlation,
        recommendedBudget,
        confidence: this.calculateConfidence(correlation, burnContribution),
      });
    }

    // Sort by burn contribution
    return attributions.sort((a, b) => b.burnContribution - a.burnContribution);
  }

  private getComponentsForService(service: string): string[] {
    // Return components for the given service
    const serviceComponents: Record<string, string[]> = {
      'api-gateway': ['load-balancer', 'auth-service', 'rate-limiter', 'cache'],
      'core-services': ['database', 'message-queue', 'storage', 'compute'],
    };
    return serviceComponents[service] || [];
  }

  private async calculateChangeCorrelation(
    component: string,
    sloId: string,
  ): Promise<number> {
    // Simulate correlation analysis between component changes and SLO burn
    const historical = this.getHistoricalData(`${component}_metrics`);
    const sloHistory = this.getHistoricalData(`${sloId}_burn`);

    if (historical.length < 2 || sloHistory.length < 2) {
      return Math.random() * 0.3; // Low correlation for insufficient data
    }

    // Simple Pearson correlation simulation
    return Math.random() * 0.8 + 0.1; // 0.1 to 0.9 correlation
  }

  private async calculateBurnContribution(
    component: string,
    sloId: string,
  ): Promise<number> {
    // Calculate how much this component contributes to SLO burn
    const burnRate = this.sloBurnRates.get(sloId)!;
    const componentWeight = this.getComponentWeight(component);

    return burnRate.currentBurn * componentWeight * (Math.random() * 0.5 + 0.1);
  }

  private getComponentWeight(component: string): number {
    // Component importance weights
    const weights: Record<string, number> = {
      database: 0.4,
      'load-balancer': 0.3,
      'auth-service': 0.2,
      cache: 0.15,
      'rate-limiter': 0.1,
      'message-queue': 0.25,
      storage: 0.2,
      compute: 0.35,
    };
    return weights[component] || 0.1;
  }

  private calculateRecommendedBudget(burnContribution: number): number {
    // Recommend budget based on burn contribution
    const baseBudget = 100; // Base budget units
    return Math.max(50, baseBudget * (1 + burnContribution));
  }

  private calculateConfidence(
    correlation: number,
    burnContribution: number,
  ): number {
    // Confidence based on correlation strength and contribution magnitude
    return Math.min(
      1.0,
      correlation * 0.6 + Math.min(1, burnContribution * 10) * 0.4,
    );
  }

  private async recommendBudgetReallocation(
    sloId: string,
    attributions: CausalAttribution[],
  ): Promise<void> {
    const topContributors = attributions
      .filter((attr) => attr.confidence > 0.7)
      .slice(0, 3);

    if (topContributors.length > 0) {
      this.emit('budgetReallocationRecommended', {
        sloId,
        recommendations: topContributors.map((attr) => ({
          component: attr.component,
          currentBudget: 100, // Current budget
          recommendedBudget: attr.recommendedBudget,
          reason: `High burn contribution: ${(attr.burnContribution * 100).toFixed(1)}%`,
        })),
      });
    }
  }

  /**
   * Optimize carbon footprint by scheduling jobs in low-carbon windows
   */
  async optimizeCarbon(): Promise<{ savings: number; deferrals: number }> {
    const jobs = this.getPendingJobs();
    let totalSavings = 0;
    let deferrals = 0;

    for (const job of jobs) {
      const optimization = await this.optimizeJobCarbon(job);
      if (optimization) {
        this.carbonOptimizations.push(optimization);
        totalSavings += optimization.carbonSavings;
        if (optimization.optimizedSchedule > optimization.originalSchedule) {
          deferrals++;
        }
      }
    }

    this.emit('carbonOptimizationComplete', {
      savings: totalSavings,
      deferrals,
    });
    return { savings: totalSavings, deferrals };
  }

  private getPendingJobs(): Array<{
    id: string;
    urgent: boolean;
    estimatedDuration: number;
    region: string;
  }> {
    // Simulate pending jobs
    return [
      {
        id: 'job-1',
        urgent: false,
        estimatedDuration: 30,
        region: 'us-east-1',
      },
      { id: 'job-2', urgent: true, estimatedDuration: 15, region: 'us-west-2' },
      {
        id: 'job-3',
        urgent: false,
        estimatedDuration: 60,
        region: 'eu-west-1',
      },
    ];
  }

  private async optimizeJobCarbon(
    job: any,
  ): Promise<CarbonOptimization | null> {
    const carbonData = this.carbonIntensity.get(job.region);
    if (!carbonData) return null;

    // Find the next green window
    const greenWindow = carbonData.forecast.find((f) => f.band === 'green');
    if (!greenWindow || job.urgent) {
      return null; // Can't defer urgent jobs or no green window available
    }

    const currentCarbon = carbonData.gCO2PerKWh * job.estimatedDuration;
    const optimizedCarbon = greenWindow.intensity * job.estimatedDuration;
    const savings = currentCarbon - optimizedCarbon;

    if (savings > 0) {
      return {
        jobId: job.id,
        originalSchedule: Date.now(),
        optimizedSchedule: greenWindow.timestamp,
        carbonSavings: savings,
        delayCost: this.calculateDelayCost(greenWindow.timestamp - Date.now()),
        urgent: job.urgent,
      };
    }

    return null;
  }

  private calculateDelayCost(delayMs: number): number {
    // Simple delay cost calculation
    const delayHours = delayMs / (60 * 60 * 1000);
    return delayHours * 0.5; // $0.50 per hour of delay
  }

  private getHistoricalData(
    metric: string,
  ): Array<{ timestamp: number; value: number }> {
    let data = this.historicalData.get(metric);
    if (!data) {
      // Generate mock historical data
      data = [];
      const now = Date.now();
      for (let i = 100; i >= 0; i--) {
        data.push({
          timestamp: now - i * 60 * 60 * 1000, // Hourly data for last 100 hours
          value: Math.random(),
        });
      }
      this.historicalData.set(metric, data);
    }
    return data;
  }

  /**
   * Get current SLO burn rates
   */
  getSLOBurnRates(): Map<string, SLOBurnRate> {
    return this.sloBurnRates;
  }

  /**
   * Get current carbon intensity data
   */
  getCarbonIntensity(): Map<string, CarbonIntensity> {
    return this.carbonIntensity;
  }

  /**
   * Get causal attribution analysis results
   */
  getCausalAttributions(): Map<string, CausalAttribution[]> {
    return this.causalAttributions;
  }

  /**
   * Get carbon optimization results
   */
  getCarbonOptimizations(): CarbonOptimization[] {
    return this.carbonOptimizations;
  }

  /**
   * Get SLO definitions
   */
  getSLODefinitions(): Map<string, SLODefinition> {
    return this.slos;
  }

  /**
   * Add or update SLO definition
   */
  updateSLO(slo: SLODefinition): void {
    this.slos.set(slo.id, slo);

    // Initialize burn rate tracking if new SLO
    if (!this.sloBurnRates.has(slo.id)) {
      this.sloBurnRates.set(slo.id, {
        sloId: slo.id,
        currentBurn: 0,
        budgetRemaining: slo.budget,
        projectedExhaustion: Date.now() + 30 * 24 * 60 * 60 * 1000,
        severity: 'ok',
      });
    }

    this.emit('sloUpdated', slo);
  }

  /**
   * Force SLO budget reset (for testing or maintenance)
   */
  resetSLOBudget(sloId: string): void {
    const slo = this.slos.get(sloId);
    const burnRate = this.sloBurnRates.get(sloId);

    if (slo && burnRate) {
      burnRate.budgetRemaining = slo.budget;
      burnRate.severity = 'ok';
      burnRate.projectedExhaustion = Date.now() + 30 * 24 * 60 * 60 * 1000;

      this.emit('sloBudgetReset', { sloId, budget: slo.budget });
    }
  }
}

export default ObservabilityEngine;
