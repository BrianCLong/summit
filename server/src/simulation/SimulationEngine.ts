/**
 * Simulation Engine
 * Runs various simulations for disaster resilience, maintenance, urban planning, and more
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SimulationScenario,
  SimulationParameters,
  SimulationResult,
  ScenarioType,
  DisasterSubtype,
  DigitalTwinAsset,
  MaintenancePrediction,
  GeoJSONGeometry,
} from '../types/digitalTwin';

/**
 * Configuration for simulation runs
 */
interface SimulationConfig {
  maxIterations: number;
  convergenceThreshold: number;
  parallelWorkers: number;
}

/**
 * Engine for running digital twin simulations
 */
export class SimulationEngine {
  private scenarios: Map<string, SimulationScenario> = new Map();
  private config: SimulationConfig;

  constructor(config?: Partial<SimulationConfig>) {
    this.config = {
      maxIterations: 1000,
      convergenceThreshold: 0.001,
      parallelWorkers: 4,
      ...config,
    };
  }

  /**
   * Creates a new simulation scenario
   * @param name - Scenario name
   * @param type - Scenario type
   * @param parameters - Simulation parameters
   * @param subtype - Optional subtype for specific scenarios
   */
  async createScenario(
    name: string,
    type: ScenarioType,
    parameters: SimulationParameters,
    subtype?: DisasterSubtype | string
  ): Promise<SimulationScenario> {
    const scenario: SimulationScenario = {
      id: uuidv4(),
      name,
      type,
      subtype,
      parameters,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  /**
   * Runs a simulation scenario
   * @param scenarioId - Scenario ID to run
   * @param assets - Assets to include in simulation
   */
  async runSimulation(
    scenarioId: string,
    assets: DigitalTwinAsset[]
  ): Promise<SimulationResult> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    scenario.status = 'RUNNING';

    try {
      let result: SimulationResult;

      switch (scenario.type) {
        case ScenarioType.DISASTER:
          result = await this.runDisasterSimulation(scenario, assets);
          break;
        case ScenarioType.MAINTENANCE:
          result = await this.runMaintenanceSimulation(scenario, assets);
          break;
        case ScenarioType.URBAN_PLANNING:
          result = await this.runUrbanPlanningSimulation(scenario, assets);
          break;
        case ScenarioType.TRAFFIC:
          result = await this.runTrafficSimulation(scenario, assets);
          break;
        case ScenarioType.CLIMATE:
          result = await this.runClimateSimulation(scenario, assets);
          break;
        default:
          throw new Error(`Unknown scenario type: ${scenario.type}`);
      }

      scenario.results = result;
      scenario.status = 'COMPLETED';
      scenario.completedAt = new Date();

      return result;
    } catch (error) {
      scenario.status = 'FAILED';
      throw error;
    }
  }

  /**
   * Runs disaster resilience simulation
   */
  private async runDisasterSimulation(
    scenario: SimulationScenario,
    assets: DigitalTwinAsset[]
  ): Promise<SimulationResult> {
    const { parameters, subtype } = scenario;
    const affectedAssets: string[] = [];
    const metrics: Record<string, number> = {};

    // Filter assets in affected area
    const targetAssets = parameters.affectedArea
      ? assets.filter((a) => this.isInArea(a.geometry, parameters.affectedArea!))
      : assets;

    const intensity = parameters.intensity || 0.5;

    switch (subtype) {
      case DisasterSubtype.EARTHQUAKE:
        return this.simulateEarthquake(targetAssets, intensity, parameters);
      case DisasterSubtype.FLOOD:
        return this.simulateFlood(targetAssets, intensity, parameters);
      case DisasterSubtype.FIRE:
        return this.simulateFireSpread(targetAssets, intensity, parameters);
      default:
        // Generic disaster simulation
        for (const asset of targetAssets) {
          const vulnerability = this.calculateVulnerability(asset);
          if (Math.random() < vulnerability * intensity) {
            affectedAssets.push(asset.id);
          }
        }
    }

    metrics.affectedCount = affectedAssets.length;
    metrics.totalAssets = targetAssets.length;
    metrics.impactPercentage = (affectedAssets.length / targetAssets.length) * 100;

    return {
      timestamp: new Date(),
      affectedAssets,
      metrics,
      predictions: [],
      recommendations: this.generateDisasterRecommendations(metrics),
      confidenceScore: 0.75,
    };
  }

  /**
   * Simulates earthquake impact
   */
  private async simulateEarthquake(
    assets: DigitalTwinAsset[],
    magnitude: number,
    params: SimulationParameters
  ): Promise<SimulationResult> {
    const affectedAssets: string[] = [];
    const damageByType: Record<string, number> = {};

    for (const asset of assets) {
      const structuralResistance = this.getStructuralResistance(asset);
      const groundAcceleration = magnitude * 0.3; // Simplified PGA
      const damageProb = Math.min(groundAcceleration / structuralResistance, 1);

      if (Math.random() < damageProb) {
        affectedAssets.push(asset.id);
        damageByType[asset.type] = (damageByType[asset.type] || 0) + 1;
      }
    }

    return {
      timestamp: new Date(),
      affectedAssets,
      metrics: {
        magnitude,
        totalDamaged: affectedAssets.length,
        ...damageByType,
        estimatedRecoveryDays: affectedAssets.length * 2,
      },
      predictions: this.generatePostDisasterPredictions(affectedAssets),
      recommendations: [
        'Prioritize critical infrastructure inspection',
        'Deploy emergency response to high-damage zones',
        'Assess structural integrity of bridges and buildings',
      ],
      confidenceScore: 0.7,
    };
  }

  /**
   * Simulates flood impact
   */
  private async simulateFlood(
    assets: DigitalTwinAsset[],
    waterLevel: number,
    params: SimulationParameters
  ): Promise<SimulationResult> {
    const affectedAssets: string[] = [];
    const floodedZones: string[] = [];

    for (const asset of assets) {
      const elevation = this.getAssetElevation(asset);
      if (elevation < waterLevel) {
        affectedAssets.push(asset.id);
        if (asset.type === 'ROAD' || asset.type === 'TRANSIT') {
          floodedZones.push(asset.id);
        }
      }
    }

    return {
      timestamp: new Date(),
      affectedAssets,
      metrics: {
        waterLevel,
        floodedAssets: affectedAssets.length,
        blockedRoutes: floodedZones.length,
        estimatedDrainageHours: waterLevel * 10,
      },
      predictions: [],
      recommendations: [
        'Activate flood barriers and pumping stations',
        'Reroute traffic from flooded zones',
        'Issue evacuation orders for low-lying areas',
      ],
      confidenceScore: 0.8,
    };
  }

  /**
   * Simulates fire spread using cellular automata
   */
  private async simulateFireSpread(
    assets: DigitalTwinAsset[],
    intensity: number,
    params: SimulationParameters
  ): Promise<SimulationResult> {
    const affectedAssets: string[] = [];
    const spreadRate = intensity * 0.1;
    const timeSteps = params.duration || 60;

    // Simple fire spread model
    const burning = new Set<string>();
    const burned = new Set<string>();

    // Initialize fire origin
    if (assets.length > 0) {
      burning.add(assets[0].id);
    }

    for (let t = 0; t < timeSteps && burning.size > 0; t++) {
      const newBurning = new Set<string>();

      for (const assetId of burning) {
        burned.add(assetId);
        affectedAssets.push(assetId);

        // Spread to neighbors (simplified)
        const neighbors = this.getNeighborAssets(assetId, assets);
        for (const neighbor of neighbors) {
          if (!burned.has(neighbor.id) && !burning.has(neighbor.id)) {
            const spreadProb = spreadRate * (1 - this.getFireResistance(neighbor));
            if (Math.random() < spreadProb) {
              newBurning.add(neighbor.id);
            }
          }
        }
      }

      burning.clear();
      newBurning.forEach((id) => burning.add(id));
    }

    return {
      timestamp: new Date(),
      affectedAssets: [...new Set(affectedAssets)],
      metrics: {
        totalBurned: burned.size,
        spreadDuration: timeSteps,
        estimatedDamage: burned.size * 100000,
      },
      predictions: [],
      recommendations: [
        'Establish firebreaks around critical infrastructure',
        'Deploy firefighting resources to containment perimeter',
        'Evacuate affected buildings immediately',
      ],
      confidenceScore: 0.65,
    };
  }

  /**
   * Runs predictive maintenance simulation
   */
  private async runMaintenanceSimulation(
    scenario: SimulationScenario,
    assets: DigitalTwinAsset[]
  ): Promise<SimulationResult> {
    const predictions: MaintenancePrediction[] = [];

    for (const asset of assets) {
      const prediction = this.predictMaintenance(asset);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    // Sort by priority
    predictions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      timestamp: new Date(),
      affectedAssets: predictions.map((p) => p.assetId),
      metrics: {
        totalPredictions: predictions.length,
        criticalCount: predictions.filter((p) => p.priority === 'CRITICAL').length,
        highCount: predictions.filter((p) => p.priority === 'HIGH').length,
        totalEstimatedCost: predictions.reduce((sum, p) => sum + p.estimatedCost, 0),
      },
      predictions,
      recommendations: this.generateMaintenanceSchedule(predictions),
      confidenceScore: 0.85,
    };
  }

  /**
   * Runs urban planning scenario simulation
   */
  private async runUrbanPlanningSimulation(
    scenario: SimulationScenario,
    assets: DigitalTwinAsset[]
  ): Promise<SimulationResult> {
    const metrics: Record<string, number> = {};

    // Analyze density
    const buildingCount = assets.filter((a) => a.type === 'BUILDING').length;
    const greenSpaceCount = assets.filter((a) => a.type === 'GREEN_SPACE').length;
    const roadLength = assets.filter((a) => a.type === 'ROAD').length;

    metrics.buildingDensity = buildingCount / assets.length;
    metrics.greenSpaceRatio = greenSpaceCount / buildingCount || 0;
    metrics.infrastructureScore = this.calculateInfrastructureScore(assets);
    metrics.walkabilityIndex = this.calculateWalkability(assets);
    metrics.sustainabilityScore = metrics.greenSpaceRatio * 50 + metrics.walkabilityIndex * 0.5;

    return {
      timestamp: new Date(),
      affectedAssets: assets.map((a) => a.id),
      metrics,
      predictions: [],
      recommendations: [
        metrics.greenSpaceRatio < 0.1 ? 'Increase green space allocation' : null,
        metrics.walkabilityIndex < 50 ? 'Improve pedestrian infrastructure' : null,
        metrics.infrastructureScore < 70 ? 'Upgrade aging infrastructure' : null,
      ].filter((r): r is string => r !== null),
      confidenceScore: 0.9,
    };
  }

  /**
   * Runs traffic flow optimization simulation
   */
  private async runTrafficSimulation(
    scenario: SimulationScenario,
    assets: DigitalTwinAsset[]
  ): Promise<SimulationResult> {
    const roads = assets.filter((a) => a.type === 'ROAD');
    const transit = assets.filter((a) => a.type === 'TRANSIT');

    const metrics: Record<string, number> = {
      roadNetworkSize: roads.length,
      transitOptions: transit.length,
      averageCongestion: Math.random() * 0.5 + 0.3,
      peakHourDelay: Math.random() * 20 + 10,
      co2EmissionsIndex: Math.random() * 100 + 50,
    };

    // Identify bottlenecks
    const bottlenecks = roads
      .filter((r) => (r.metadata.capacity || 1000) < 500)
      .map((r) => r.id);

    return {
      timestamp: new Date(),
      affectedAssets: bottlenecks,
      metrics,
      predictions: [],
      recommendations: [
        'Implement adaptive traffic signal control',
        'Add dedicated bus lanes on high-traffic corridors',
        'Optimize traffic signal timing at identified bottlenecks',
        'Consider congestion pricing during peak hours',
      ],
      confidenceScore: 0.75,
    };
  }

  /**
   * Runs climate impact projection simulation
   */
  private async runClimateSimulation(
    scenario: SimulationScenario,
    assets: DigitalTwinAsset[]
  ): Promise<SimulationResult> {
    const years = scenario.parameters.duration || 30;
    const temperatureRise = years * 0.03; // 0.03°C per year
    const seaLevelRise = years * 3.3; // 3.3mm per year

    const atRiskAssets = assets.filter((a) => {
      const elevation = this.getAssetElevation(a);
      return elevation < seaLevelRise / 1000;
    });

    const heatVulnerable = assets.filter((a) => {
      return a.type === 'POWER_GRID' || a.type === 'WATER_SYSTEM';
    });

    return {
      timestamp: new Date(),
      affectedAssets: [...atRiskAssets, ...heatVulnerable].map((a) => a.id),
      metrics: {
        projectionYears: years,
        temperatureRise,
        seaLevelRiseMm: seaLevelRise,
        assetsAtFloodRisk: atRiskAssets.length,
        heatStressAssets: heatVulnerable.length,
        adaptationCostEstimate: atRiskAssets.length * 500000,
      },
      predictions: [],
      recommendations: [
        'Develop coastal resilience plan for at-risk assets',
        'Upgrade power grid for higher temperature tolerance',
        'Implement water conservation measures',
        'Create urban heat island mitigation strategies',
      ],
      confidenceScore: 0.6,
    };
  }

  /**
   * Gets scenario by ID
   */
  async getScenario(id: string): Promise<SimulationScenario | null> {
    return this.scenarios.get(id) || null;
  }

  /**
   * Lists all scenarios
   */
  async listScenarios(): Promise<SimulationScenario[]> {
    return Array.from(this.scenarios.values());
  }

  // Helper methods
  private calculateVulnerability(asset: DigitalTwinAsset): number {
    const baseVulnerability = 0.3;
    const ageFactor = asset.metadata.constructionDate
      ? (Date.now() - new Date(asset.metadata.constructionDate).getTime()) /
        (365 * 24 * 60 * 60 * 1000 * 50)
      : 0.5;
    return Math.min(baseVulnerability + ageFactor * 0.3, 1);
  }

  private getStructuralResistance(asset: DigitalTwinAsset): number {
    const typeResistance: Record<string, number> = {
      BUILDING: 0.7,
      BRIDGE: 0.8,
      ROAD: 0.9,
      UTILITY: 0.5,
    };
    return typeResistance[asset.type] || 0.6;
  }

  private getAssetElevation(asset: DigitalTwinAsset): number {
    if (asset.geometry.type === 'Point') {
      return (asset.geometry.coordinates as number[])[2] || 0;
    }
    return (asset.metadata.customFields?.elevation as number) || 10;
  }

  private getFireResistance(asset: DigitalTwinAsset): number {
    const materials = asset.metadata.materials || [];
    if (materials.includes('concrete') || materials.includes('steel')) return 0.9;
    if (materials.includes('brick')) return 0.7;
    return 0.3;
  }

  private getNeighborAssets(assetId: string, assets: DigitalTwinAsset[]): DigitalTwinAsset[] {
    // Simplified: return random nearby assets
    return assets.filter((a) => a.id !== assetId).slice(0, 3);
  }

  private isInArea(geometry: GeoJSONGeometry, area: GeoJSONGeometry): boolean {
    return true; // Simplified for demo
  }

  private predictMaintenance(asset: DigitalTwinAsset): MaintenancePrediction | null {
    if (asset.healthScore > 80) return null;

    const daysToFailure = Math.max(30, asset.healthScore * 3);
    const failureDate = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000);

    return {
      assetId: asset.id,
      predictedFailureDate: failureDate,
      failureProbability: (100 - asset.healthScore) / 100,
      recommendedAction: asset.healthScore < 30 ? 'Immediate replacement' : 'Schedule maintenance',
      estimatedCost: asset.healthScore < 50 ? 50000 : 15000,
      priority: asset.healthScore < 30 ? 'CRITICAL' : asset.healthScore < 50 ? 'HIGH' : 'MEDIUM',
      confidenceInterval: {
        lower: new Date(failureDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        upper: new Date(failureDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
    };
  }

  private generatePostDisasterPredictions(affectedIds: string[]): MaintenancePrediction[] {
    return affectedIds.slice(0, 5).map((id) => ({
      assetId: id,
      predictedFailureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      failureProbability: 0.8,
      recommendedAction: 'Post-disaster inspection required',
      estimatedCost: 25000,
      priority: 'HIGH' as const,
      confidenceInterval: {
        lower: new Date(),
        upper: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }));
  }

  private generateDisasterRecommendations(metrics: Record<string, number>): string[] {
    const recommendations: string[] = [];
    if (metrics.impactPercentage > 50) {
      recommendations.push('Declare state of emergency');
    }
    if (metrics.affectedCount > 10) {
      recommendations.push('Deploy emergency response teams');
    }
    recommendations.push('Conduct damage assessment');
    return recommendations;
  }

  private generateMaintenanceSchedule(predictions: MaintenancePrediction[]): string[] {
    return [
      `Schedule ${predictions.filter((p) => p.priority === 'CRITICAL').length} critical repairs immediately`,
      `Plan ${predictions.filter((p) => p.priority === 'HIGH').length} high-priority maintenance within 30 days`,
      `Budget $${predictions.reduce((s, p) => s + p.estimatedCost, 0).toLocaleString()} for maintenance`,
    ];
  }

  private calculateInfrastructureScore(assets: DigitalTwinAsset[]): number {
    const avgHealth = assets.reduce((sum, a) => sum + a.healthScore, 0) / assets.length;
    return avgHealth;
  }

  private calculateWalkability(assets: DigitalTwinAsset[]): number {
    const sidewalks = assets.filter((a) => a.tags?.includes('pedestrian')).length;
    return Math.min((sidewalks / assets.length) * 200, 100);
  }
}

export const simulationEngine = new SimulationEngine();
