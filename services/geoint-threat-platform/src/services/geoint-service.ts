/**
 * GEOINT Analysis Service
 * Core geospatial intelligence analysis and satellite/terrain processing
 */

import type {
  SatelliteAnalysis,
  Terrain3DPoint,
  Viz3DAgent,
  GeoThreatActor,
  TerrainType,
} from '../types/index.js';

/**
 * Viewshed analysis result
 */
interface ViewshedResult {
  observerPoint: { latitude: number; longitude: number; elevation: number };
  visibleArea: number; // square meters
  visibleCells: Array<{
    latitude: number;
    longitude: number;
    distance: number;
    angle: number;
  }>;
  blindSpots: Array<{
    latitude: number;
    longitude: number;
    reason: 'TERRAIN' | 'OBSTRUCTION' | 'DISTANCE';
  }>;
  analysisTime: number;
}

/**
 * Line of sight analysis result
 */
interface LineOfSightResult {
  observer: { latitude: number; longitude: number; elevation: number };
  target: { latitude: number; longitude: number; elevation: number };
  visible: boolean;
  obstructions: Array<{
    latitude: number;
    longitude: number;
    elevation: number;
    distance: number;
    type: string;
  }>;
  clearanceAngle: number; // degrees
  distance: number; // meters
}

/**
 * Terrain analysis result
 */
interface TerrainAnalysisResult {
  bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  statistics: {
    minElevation: number;
    maxElevation: number;
    meanElevation: number;
    meanSlope: number;
    maxSlope: number;
    dominantAspect: number;
    roughnessIndex: number;
  };
  terrainClassification: Record<TerrainType, number>; // percentage
  accessibility: {
    vehicleAccessible: number; // percentage
    footAccessible: number;
    helicopterLZ: number;
  };
  strategicValue: {
    observationPoints: Array<{ latitude: number; longitude: number; score: number }>;
    chokPoints: Array<{ latitude: number; longitude: number; score: number }>;
    coverAreas: Array<{ latitude: number; longitude: number; coverage: number }>;
  };
}

/**
 * Satellite change detection result
 */
interface ChangeDetectionResult {
  analysisId: string;
  baseImageId: string;
  compareImageId: string;
  timeDelta: number; // seconds between images
  changes: Array<{
    type: 'CONSTRUCTION' | 'DEMOLITION' | 'VEHICLE_MOVEMENT' | 'VEGETATION_CHANGE' |
          'WATER_LEVEL' | 'MILITARY_ACTIVITY' | 'INFRASTRUCTURE' | 'UNKNOWN';
    geometry: unknown; // GeoJSON
    confidence: number;
    area: number; // square meters
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  summary: {
    totalChangedArea: number;
    significantChanges: number;
    criticalAlerts: number;
  };
}

/**
 * GEOINT Analysis Service
 * Provides comprehensive geospatial intelligence analysis capabilities
 */
export class GEOINTService {
  private agents: Map<string, Viz3DAgent>;
  private terrainCache: Map<string, Terrain3DPoint[]>;
  private analysisQueue: Array<{ id: string; type: string; params: unknown }>;

  constructor() {
    this.agents = new Map();
    this.terrainCache = new Map();
    this.analysisQueue = [];
  }

  // ============================================================================
  // 3D Visualization Agents
  // ============================================================================

  /**
   * Register a 3D visualization agent
   */
  async registerAgent(agent: Viz3DAgent): Promise<void> {
    this.agents.set(agent.id, {
      ...agent,
      status: 'READY',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Get available agents by type
   */
  getAgentsByType(type: Viz3DAgent['type']): Viz3DAgent[] {
    return Array.from(this.agents.values()).filter(a => a.type === type);
  }

  /**
   * Execute agent task
   */
  async executeAgentTask<T>(
    agentId: string,
    task: string,
    params: unknown
  ): Promise<T> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Update agent status
    this.agents.set(agentId, { ...agent, status: 'PROCESSING' });

    try {
      const startTime = performance.now();
      let result: unknown;

      switch (agent.type) {
        case 'VIEWSHED_ANALYZER':
          result = await this.performViewshedAnalysis(params as {
            observer: { latitude: number; longitude: number; elevation: number };
            maxRadius: number;
            resolution: number;
          });
          break;
        case 'LINE_OF_SIGHT':
          result = await this.performLineOfSightAnalysis(params as {
            observer: { latitude: number; longitude: number; elevation: number };
            target: { latitude: number; longitude: number; elevation: number };
          });
          break;
        case 'TERRAIN_RENDERER':
          result = await this.generateTerrainMesh(params as {
            bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
            resolution: number;
          });
          break;
        default:
          throw new Error(`Unknown agent type: ${agent.type}`);
      }

      const processingTime = performance.now() - startTime;

      // Update agent metrics
      this.agents.set(agentId, {
        ...agent,
        status: 'READY',
        metrics: {
          ...agent.metrics,
          lastProcessingTime: new Date().toISOString(),
          averageLatency: (agent.metrics.averageLatency + processingTime) / 2,
        },
      });

      return result as T;
    } catch (error) {
      this.agents.set(agentId, { ...agent, status: 'ERROR' });
      throw error;
    }
  }

  // ============================================================================
  // Terrain Analysis
  // ============================================================================

  /**
   * Perform viewshed analysis from an observation point
   */
  async performViewshedAnalysis(params: {
    observer: { latitude: number; longitude: number; elevation: number };
    maxRadius: number; // meters
    resolution: number; // meters per cell
  }): Promise<ViewshedResult> {
    const startTime = performance.now();
    const { observer, maxRadius, resolution } = params;

    // Generate viewshed using ray casting algorithm
    const visibleCells: ViewshedResult['visibleCells'] = [];
    const blindSpots: ViewshedResult['blindSpots'] = [];

    const numRays = 360;
    const numRingsMax = Math.ceil(maxRadius / resolution);

    for (let angle = 0; angle < numRays; angle++) {
      const angleRad = (angle * Math.PI) / 180;
      let maxTanAngle = -Infinity;

      for (let ring = 1; ring <= numRingsMax; ring++) {
        const distance = ring * resolution;
        const dx = distance * Math.cos(angleRad);
        const dy = distance * Math.sin(angleRad);

        // Convert to lat/lon offset (simplified)
        const latOffset = dy / 111320;
        const lonOffset = dx / (111320 * Math.cos(observer.latitude * Math.PI / 180));

        const cellLat = observer.latitude + latOffset;
        const cellLon = observer.longitude + lonOffset;

        // Get terrain elevation (simulated)
        const terrainElevation = this.getTerrainElevation(cellLat, cellLon);
        const elevationDiff = terrainElevation - observer.elevation;
        const tanAngle = elevationDiff / distance;

        if (tanAngle > maxTanAngle) {
          // Cell is visible
          visibleCells.push({
            latitude: cellLat,
            longitude: cellLon,
            distance,
            angle,
          });
          maxTanAngle = tanAngle;
        } else {
          // Cell is blocked
          blindSpots.push({
            latitude: cellLat,
            longitude: cellLon,
            reason: 'TERRAIN',
          });
        }
      }
    }

    // Calculate visible area
    const visibleArea = visibleCells.length * resolution * resolution;

    return {
      observerPoint: observer,
      visibleArea,
      visibleCells,
      blindSpots,
      analysisTime: performance.now() - startTime,
    };
  }

  /**
   * Perform line of sight analysis between two points
   */
  async performLineOfSightAnalysis(params: {
    observer: { latitude: number; longitude: number; elevation: number };
    target: { latitude: number; longitude: number; elevation: number };
  }): Promise<LineOfSightResult> {
    const { observer, target } = params;

    // Calculate distance and bearing
    const distance = this.haversineDistance(
      observer.latitude, observer.longitude,
      target.latitude, target.longitude
    );

    const obstructions: LineOfSightResult['obstructions'] = [];
    const numSamples = Math.ceil(distance / 10); // Sample every 10 meters
    let visible = true;

    // Calculate the straight-line elevation profile
    const observerHeight = observer.elevation;
    const targetHeight = target.elevation;

    for (let i = 1; i < numSamples; i++) {
      const fraction = i / numSamples;
      const sampleLat = observer.latitude + (target.latitude - observer.latitude) * fraction;
      const sampleLon = observer.longitude + (target.longitude - observer.longitude) * fraction;
      const sampleDistance = distance * fraction;

      // Get terrain elevation at sample point
      const terrainElevation = this.getTerrainElevation(sampleLat, sampleLon);

      // Calculate expected elevation on the sight line
      const expectedElevation = observerHeight + (targetHeight - observerHeight) * fraction;

      if (terrainElevation > expectedElevation) {
        visible = false;
        obstructions.push({
          latitude: sampleLat,
          longitude: sampleLon,
          elevation: terrainElevation,
          distance: sampleDistance,
          type: 'TERRAIN',
        });
      }
    }

    // Calculate clearance angle
    const elevationDiff = targetHeight - observerHeight;
    const clearanceAngle = Math.atan2(elevationDiff, distance) * (180 / Math.PI);

    return {
      observer,
      target,
      visible,
      obstructions,
      clearanceAngle,
      distance,
    };
  }

  /**
   * Analyze terrain within a bounding box
   */
  async analyzeTerrainRegion(
    bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number },
    resolution: number = 30 // meters
  ): Promise<TerrainAnalysisResult> {
    const terrainPoints = await this.getTerrainData(bbox, resolution);

    if (terrainPoints.length === 0) {
      throw new Error('No terrain data available for specified region');
    }

    // Calculate statistics
    const elevations = terrainPoints.map(p => p.elevation);
    const slopes = terrainPoints.map(p => p.slope || 0);

    const statistics = {
      minElevation: Math.min(...elevations),
      maxElevation: Math.max(...elevations),
      meanElevation: elevations.reduce((a, b) => a + b, 0) / elevations.length,
      meanSlope: slopes.reduce((a, b) => a + b, 0) / slopes.length,
      maxSlope: Math.max(...slopes),
      dominantAspect: this.calculateDominantAspect(terrainPoints),
      roughnessIndex: this.calculateRoughnessIndex(terrainPoints),
    };

    // Classify terrain types
    const terrainClassification = this.classifyTerrain(terrainPoints);

    // Calculate accessibility
    const accessibility = {
      vehicleAccessible: terrainPoints.filter(p => (p.slope || 0) < 15).length / terrainPoints.length * 100,
      footAccessible: terrainPoints.filter(p => (p.slope || 0) < 45).length / terrainPoints.length * 100,
      helicopterLZ: terrainPoints.filter(p => (p.slope || 0) < 7 && (p.roughness || 0) < 0.3).length / terrainPoints.length * 100,
    };

    // Find strategic locations
    const strategicValue = {
      observationPoints: this.findObservationPoints(terrainPoints),
      chokPoints: this.findChokePoints(terrainPoints),
      coverAreas: this.findCoverAreas(terrainPoints),
    };

    return {
      bbox,
      statistics,
      terrainClassification,
      accessibility,
      strategicValue,
    };
  }

  /**
   * Generate 3D terrain mesh for visualization
   */
  async generateTerrainMesh(params: {
    bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    resolution: number;
  }): Promise<{
    vertices: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    uvs: Float32Array;
  }> {
    const { bbox, resolution } = params;
    const terrainPoints = await this.getTerrainData(bbox, resolution);

    // Calculate grid dimensions
    const latRange = bbox.maxLat - bbox.minLat;
    const lonRange = bbox.maxLon - bbox.minLon;
    const gridWidth = Math.ceil(lonRange * 111320 / resolution);
    const gridHeight = Math.ceil(latRange * 111320 / resolution);

    const numVertices = gridWidth * gridHeight;
    const vertices = new Float32Array(numVertices * 3);
    const normals = new Float32Array(numVertices * 3);
    const uvs = new Float32Array(numVertices * 2);

    // Generate vertices
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const idx = y * gridWidth + x;
        const lat = bbox.minLat + (y / gridHeight) * latRange;
        const lon = bbox.minLon + (x / gridWidth) * lonRange;
        const elevation = this.getTerrainElevation(lat, lon);

        // Vertex position (x, y, z)
        vertices[idx * 3] = x * resolution;
        vertices[idx * 3 + 1] = elevation;
        vertices[idx * 3 + 2] = y * resolution;

        // UV coordinates
        uvs[idx * 2] = x / gridWidth;
        uvs[idx * 2 + 1] = y / gridHeight;

        // Normal (simplified - pointing up with slight variation)
        normals[idx * 3] = 0;
        normals[idx * 3 + 1] = 1;
        normals[idx * 3 + 2] = 0;
      }
    }

    // Generate indices for triangles
    const numQuads = (gridWidth - 1) * (gridHeight - 1);
    const indices = new Uint32Array(numQuads * 6);
    let indexOffset = 0;

    for (let y = 0; y < gridHeight - 1; y++) {
      for (let x = 0; x < gridWidth - 1; x++) {
        const topLeft = y * gridWidth + x;
        const topRight = topLeft + 1;
        const bottomLeft = (y + 1) * gridWidth + x;
        const bottomRight = bottomLeft + 1;

        // First triangle
        indices[indexOffset++] = topLeft;
        indices[indexOffset++] = bottomLeft;
        indices[indexOffset++] = topRight;

        // Second triangle
        indices[indexOffset++] = topRight;
        indices[indexOffset++] = bottomLeft;
        indices[indexOffset++] = bottomRight;
      }
    }

    return { vertices, indices, normals, uvs };
  }

  // ============================================================================
  // Satellite Imagery Analysis
  // ============================================================================

  /**
   * Analyze satellite imagery for feature detection
   */
  async analyzeSatelliteImagery(
    imageId: string,
    analysisTypes: string[]
  ): Promise<SatelliteAnalysis> {
    const startTime = performance.now();

    // Simulated analysis - in production this would call ML models
    const detectedFeatures: SatelliteAnalysis['detectedFeatures'] = [];
    const anomalies: SatelliteAnalysis['anomalies'] = [];

    // Feature detection simulation
    if (analysisTypes.includes('BUILDINGS')) {
      detectedFeatures.push({
        type: 'BUILDING',
        confidence: 0.92,
        geometry: { type: 'Polygon', coordinates: [[]] },
        properties: { area: 500, height: 15 },
      });
    }

    if (analysisTypes.includes('VEHICLES')) {
      detectedFeatures.push({
        type: 'VEHICLE',
        confidence: 0.85,
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { vehicleType: 'TRUCK' },
      });
    }

    if (analysisTypes.includes('ANOMALIES')) {
      anomalies.push({
        type: 'UNUSUAL_ACTIVITY',
        location: { latitude: 38.9, longitude: -77.0 },
        severity: 'MEDIUM',
        description: 'Unusual vehicle gathering detected',
        confidence: 0.78,
      });
    }

    const processingDuration = performance.now() - startTime;

    return {
      id: `analysis_${Date.now()}`,
      imageId,
      provider: 'MAXAR',
      imageryType: 'OPTICAL',
      captureDate: new Date().toISOString(),
      bbox: { minLon: -77.1, minLat: 38.8, maxLon: -76.9, maxLat: 39.0 },
      resolution: 0.5,
      cloudCover: 5,
      detectedFeatures,
      anomalies,
      analysisTimestamp: new Date().toISOString(),
      processingDuration,
      tenantId: 'system',
    };
  }

  /**
   * Perform change detection between two satellite images
   */
  async performChangeDetection(
    baseImageId: string,
    compareImageId: string
  ): Promise<ChangeDetectionResult> {
    const startTime = performance.now();

    // Simulated change detection
    const changes: ChangeDetectionResult['changes'] = [
      {
        type: 'CONSTRUCTION',
        geometry: { type: 'Polygon', coordinates: [[]] },
        confidence: 0.88,
        area: 2500,
        description: 'New structure under construction',
        severity: 'LOW',
      },
      {
        type: 'VEHICLE_MOVEMENT',
        geometry: { type: 'Point', coordinates: [-77.05, 38.95] },
        confidence: 0.75,
        area: 100,
        description: 'Vehicle convoy movement detected',
        severity: 'MEDIUM',
      },
    ];

    return {
      analysisId: `change_${Date.now()}`,
      baseImageId,
      compareImageId,
      timeDelta: 86400 * 7, // 7 days
      changes,
      summary: {
        totalChangedArea: changes.reduce((sum, c) => sum + c.area, 0),
        significantChanges: changes.length,
        criticalAlerts: changes.filter(c => c.severity === 'CRITICAL').length,
      },
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get terrain elevation at a point (simulated)
   */
  private getTerrainElevation(lat: number, lon: number): number {
    // Simulated terrain using Perlin-like noise
    const x = lon * 100;
    const y = lat * 100;
    return 100 + Math.sin(x * 0.1) * 50 + Math.cos(y * 0.1) * 30 + Math.sin((x + y) * 0.05) * 20;
  }

  /**
   * Get terrain data for a bounding box
   */
  private async getTerrainData(
    bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number },
    resolution: number
  ): Promise<Terrain3DPoint[]> {
    const cacheKey = `terrain_${bbox.minLon}_${bbox.minLat}_${bbox.maxLon}_${bbox.maxLat}_${resolution}`;

    if (this.terrainCache.has(cacheKey)) {
      return this.terrainCache.get(cacheKey)!;
    }

    const points: Terrain3DPoint[] = [];
    const latStep = resolution / 111320;
    const lonStep = resolution / (111320 * Math.cos((bbox.minLat + bbox.maxLat) / 2 * Math.PI / 180));

    for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += latStep) {
      for (let lon = bbox.minLon; lon <= bbox.maxLon; lon += lonStep) {
        const elevation = this.getTerrainElevation(lat, lon);
        points.push({
          latitude: lat,
          longitude: lon,
          elevation,
          slope: Math.random() * 45,
          aspect: Math.random() * 360,
          roughness: Math.random(),
          terrainType: this.getTerrainTypeForPoint(lat, lon),
        });
      }
    }

    this.terrainCache.set(cacheKey, points);
    return points;
  }

  /**
   * Get terrain type for a point (simulated)
   */
  private getTerrainTypeForPoint(lat: number, lon: number): TerrainType {
    const types: TerrainType[] = ['URBAN', 'SUBURBAN', 'RURAL', 'MOUNTAINOUS', 'FOREST'];
    return types[Math.floor(Math.abs(lat + lon) * 10) % types.length];
  }

  /**
   * Calculate Haversine distance
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Calculate dominant aspect from terrain points
   */
  private calculateDominantAspect(points: Terrain3DPoint[]): number {
    const aspects = points.filter(p => p.aspect !== undefined).map(p => p.aspect!);
    if (aspects.length === 0) return 0;
    return aspects.reduce((a, b) => a + b, 0) / aspects.length;
  }

  /**
   * Calculate terrain roughness index
   */
  private calculateRoughnessIndex(points: Terrain3DPoint[]): number {
    const roughness = points.filter(p => p.roughness !== undefined).map(p => p.roughness!);
    if (roughness.length === 0) return 0;
    return roughness.reduce((a, b) => a + b, 0) / roughness.length;
  }

  /**
   * Classify terrain types in region
   */
  private classifyTerrain(points: Terrain3DPoint[]): Record<TerrainType, number> {
    const counts: Record<string, number> = {};
    for (const point of points) {
      const type = point.terrainType || 'RURAL';
      counts[type] = (counts[type] || 0) + 1;
    }

    const result: Record<TerrainType, number> = {} as Record<TerrainType, number>;
    const total = points.length;
    for (const [type, count] of Object.entries(counts)) {
      result[type as TerrainType] = (count / total) * 100;
    }
    return result;
  }

  /**
   * Find observation points in terrain
   */
  private findObservationPoints(points: Terrain3DPoint[]): Array<{ latitude: number; longitude: number; score: number }> {
    // Find high points with good visibility
    const sorted = [...points].sort((a, b) => b.elevation - a.elevation);
    return sorted.slice(0, 10).map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      score: p.elevation / 1000, // Normalize score
    }));
  }

  /**
   * Find choke points in terrain
   */
  private findChokePoints(points: Terrain3DPoint[]): Array<{ latitude: number; longitude: number; score: number }> {
    // Find narrow passages between high terrain
    return points
      .filter(p => (p.slope || 0) > 30)
      .slice(0, 10)
      .map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        score: (p.slope || 0) / 45,
      }));
  }

  /**
   * Find cover areas in terrain
   */
  private findCoverAreas(points: Terrain3DPoint[]): Array<{ latitude: number; longitude: number; coverage: number }> {
    // Find areas with dense vegetation or urban cover
    return points
      .filter(p => p.terrainType === 'FOREST' || p.terrainType === 'URBAN')
      .slice(0, 10)
      .map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        coverage: 0.8 + Math.random() * 0.2,
      }));
  }
}

export default GEOINTService;
