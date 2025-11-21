/**
 * Identity Intelligence Analytics
 *
 * Person of interest tracking, network analysis, movement history,
 * pattern of life analysis, and predictive modeling.
 */

import { IdentityRecord, IdentityGraph, IdentityEdge } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface PersonOfInterest {
  identityId: string;
  identity: IdentityRecord;
  classification: 'SUBJECT' | 'ASSOCIATE' | 'CONTACT' | 'UNKNOWN';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  watchlistStatus: Array<{
    watchlistId: string;
    watchlistName: string;
    status: 'ACTIVE' | 'HISTORICAL' | 'CLEARED';
    addedDate: string;
  }>;
  threatIndicators: ThreatIndicator[];
  lastKnownLocation?: LocationRecord;
  currentStatus: 'ACTIVE' | 'INACTIVE' | 'UNDER_SURVEILLANCE' | 'DETAINED' | 'UNKNOWN';
  handlingInstructions?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatIndicator {
  indicatorId: string;
  type: 'BEHAVIORAL' | 'NETWORK' | 'TRAVEL' | 'COMMUNICATION' | 'FINANCIAL' | 'HISTORICAL';
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  source: string;
  detectedAt: string;
  validUntil?: string;
  evidence: Array<{
    type: string;
    description: string;
    weight: number;
  }>;
}

export interface LocationRecord {
  locationId: string;
  coordinates: { latitude: number; longitude: number };
  address?: string;
  city?: string;
  country: string;
  accuracy: number;
  source: string;
  timestamp: string;
  duration?: number; // minutes
  confidence: number;
}

export interface MovementHistory {
  identityId: string;
  locations: LocationRecord[];
  trips: Array<{
    tripId: string;
    origin: LocationRecord;
    destination: LocationRecord;
    departureTime: string;
    arrivalTime: string;
    mode: 'AIR' | 'LAND' | 'SEA' | 'UNKNOWN';
    distance: number; // km
  }>;
  frequentLocations: Array<{
    location: LocationRecord;
    frequency: number;
    avgDuration: number;
    pattern: 'REGULAR' | 'OCCASIONAL' | 'RARE';
  }>;
  anomalies: Array<{
    type: string;
    description: string;
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export interface PatternOfLife {
  identityId: string;
  dailyRoutine: {
    weekday: Array<{ hour: number; activity: string; location?: string; confidence: number }>;
    weekend: Array<{ hour: number; activity: string; location?: string; confidence: number }>;
  };
  keyLocations: Array<{
    type: 'HOME' | 'WORK' | 'FREQUENT' | 'SIGNIFICANT';
    location: LocationRecord;
    visitPattern: string;
    avgVisitsPerWeek: number;
  }>;
  associations: Array<{
    identityId: string;
    relationshipType: string;
    interactionFrequency: number;
    lastContact: string;
  }>;
  communicationPatterns: {
    peakHours: number[];
    preferredChannels: string[];
    avgMessagesPerDay: number;
  };
  financialPatterns?: {
    avgTransactionSize: number;
    transactionFrequency: number;
    unusualActivity: boolean;
  };
  behavioralBaseline: {
    normalActivity: string[];
    deviationThreshold: number;
  };
  lastUpdated: string;
}

export interface NetworkAnalysis {
  subjectId: string;
  network: {
    nodes: Array<{
      id: string;
      type: 'SUBJECT' | 'ASSOCIATE' | 'ORGANIZATION' | 'LOCATION';
      label: string;
      properties: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: string;
      weight: number;
      properties: Record<string, unknown>;
    }>;
  };
  metrics: {
    degree: number;
    betweenness: number;
    closeness: number;
    pageRank: number;
    clusteringCoefficient: number;
  };
  communities: Array<{
    communityId: string;
    members: string[];
    cohesion: number;
  }>;
  keyConnections: Array<{
    nodeId: string;
    importance: number;
    relationshipPath: string[];
  }>;
  analysisDate: string;
}

export interface TimelineEvent {
  eventId: string;
  identityId: string;
  timestamp: string;
  eventType: string;
  description: string;
  location?: LocationRecord;
  relatedEntities: string[];
  source: string;
  confidence: number;
  significance: 'LOW' | 'MEDIUM' | 'HIGH';
  verified: boolean;
}

export interface PredictiveModel {
  modelId: string;
  identityId: string;
  predictions: Array<{
    type: 'LOCATION' | 'BEHAVIOR' | 'TRAVEL' | 'CONTACT' | 'RISK';
    prediction: string;
    probability: number;
    timeframe: { start: string; end: string };
    confidence: number;
    basis: string[];
  }>;
  riskForecast: {
    current: number;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    forecast: Array<{ date: string; score: number }>;
  };
  alerts: Array<{
    type: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  }>;
  generatedAt: string;
  validUntil: string;
}

export interface IntelligenceProduct {
  productId: string;
  type: 'PROFILE' | 'NETWORK_REPORT' | 'THREAT_ASSESSMENT' | 'TRAVEL_BRIEF' | 'LINK_ANALYSIS';
  classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  subjects: string[];
  title: string;
  summary: string;
  content: {
    sections: Array<{
      title: string;
      content: string;
      attachments?: string[];
    }>;
  };
  keyFindings: string[];
  recommendations: string[];
  sources: Array<{
    name: string;
    reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    credibility: '1' | '2' | '3' | '4' | '5' | '6';
  }>;
  dissemination: string[];
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
}

// ============================================================================
// Person of Interest Tracker
// ============================================================================

export class PersonOfInterestTracker {
  private pois: Map<string, PersonOfInterest> = new Map();

  /**
   * Create or update a person of interest
   */
  track(identity: IdentityRecord, classification: PersonOfInterest['classification']): PersonOfInterest {
    const existingPoi = this.pois.get(identity.identityId);

    const poi: PersonOfInterest = {
      identityId: identity.identityId,
      identity,
      classification,
      riskLevel: existingPoi?.riskLevel || 'LOW',
      riskScore: existingPoi?.riskScore || 0,
      watchlistStatus: existingPoi?.watchlistStatus || [],
      threatIndicators: existingPoi?.threatIndicators || [],
      currentStatus: existingPoi?.currentStatus || 'UNKNOWN',
      priority: existingPoi?.priority || 3,
      createdAt: existingPoi?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.pois.set(identity.identityId, poi);
    return poi;
  }

  /**
   * Add threat indicator
   */
  addThreatIndicator(identityId: string, indicator: ThreatIndicator): void {
    const poi = this.pois.get(identityId);
    if (poi) {
      poi.threatIndicators.push(indicator);
      this.recalculateRisk(poi);
    }
  }

  /**
   * Recalculate risk based on indicators
   */
  private recalculateRisk(poi: PersonOfInterest): void {
    let riskScore = 0;
    for (const indicator of poi.threatIndicators) {
      const severityWeight = {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 5
      }[indicator.severity];
      riskScore += severityWeight * indicator.confidence;
    }

    poi.riskScore = Math.min(100, riskScore);

    if (poi.riskScore >= 75) poi.riskLevel = 'CRITICAL';
    else if (poi.riskScore >= 50) poi.riskLevel = 'HIGH';
    else if (poi.riskScore >= 25) poi.riskLevel = 'MEDIUM';
    else poi.riskLevel = 'LOW';
  }

  /**
   * Update location
   */
  updateLocation(identityId: string, location: LocationRecord): void {
    const poi = this.pois.get(identityId);
    if (poi) {
      poi.lastKnownLocation = location;
      poi.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Get all POIs by risk level
   */
  getByRiskLevel(riskLevel: PersonOfInterest['riskLevel']): PersonOfInterest[] {
    return [...this.pois.values()].filter(poi => poi.riskLevel === riskLevel);
  }

  /**
   * Get high priority POIs
   */
  getHighPriority(): PersonOfInterest[] {
    return [...this.pois.values()]
      .filter(poi => poi.priority <= 2 || poi.riskLevel === 'CRITICAL')
      .sort((a, b) => a.priority - b.priority);
  }
}

// ============================================================================
// Network Analyzer
// ============================================================================

export class NetworkAnalyzer {
  /**
   * Analyze identity network from graph
   */
  analyze(graph: IdentityGraph, subjectId: string): NetworkAnalysis {
    const nodes = graph.nodes.map(n => ({
      id: n.nodeId,
      type: n.nodeType as NetworkAnalysis['network']['nodes'][0]['type'],
      label: n.identityId,
      properties: n.data
    }));

    const edges = graph.edges.map(e => ({
      source: e.sourceNode,
      target: e.targetNode,
      type: e.edgeType,
      weight: e.strength,
      properties: e.metadata || {}
    }));

    // Calculate metrics
    const degree = edges.filter(e => e.source === subjectId || e.target === subjectId).length;
    const totalEdges = edges.length;
    const totalNodes = nodes.length;

    // Simple betweenness approximation
    const betweenness = degree / Math.max(totalEdges, 1);

    // Simple closeness approximation
    const closeness = 1 / (1 + (totalNodes - degree));

    // Clustering coefficient
    const neighbors = new Set<string>();
    for (const e of edges) {
      if (e.source === subjectId) neighbors.add(e.target);
      if (e.target === subjectId) neighbors.add(e.source);
    }

    let neighborLinks = 0;
    for (const e of edges) {
      if (neighbors.has(e.source) && neighbors.has(e.target)) {
        neighborLinks++;
      }
    }

    const maxNeighborLinks = (neighbors.size * (neighbors.size - 1)) / 2;
    const clusteringCoefficient = maxNeighborLinks > 0 ? neighborLinks / maxNeighborLinks : 0;

    // Find key connections (highest weight edges)
    const keyConnections = edges
      .filter(e => e.source === subjectId || e.target === subjectId)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(e => ({
        nodeId: e.source === subjectId ? e.target : e.source,
        importance: e.weight,
        relationshipPath: [e.type]
      }));

    return {
      subjectId,
      network: { nodes, edges },
      metrics: {
        degree,
        betweenness,
        closeness,
        pageRank: degree / totalNodes,
        clusteringCoefficient
      },
      communities: [],
      keyConnections,
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(graph: IdentityGraph, sourceId: string, targetId: string): string[] {
    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [{ node: sourceId, path: [sourceId] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === targetId) {
        return path;
      }

      if (visited.has(node)) continue;
      visited.add(node);

      for (const edge of graph.edges) {
        let neighbor: string | null = null;
        if (edge.sourceNode === node && !visited.has(edge.targetNode)) {
          neighbor = edge.targetNode;
        } else if (edge.targetNode === node && !visited.has(edge.sourceNode)) {
          neighbor = edge.sourceNode;
        }

        if (neighbor) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return []; // No path found
  }
}

// ============================================================================
// Pattern of Life Analyzer
// ============================================================================

export class PatternOfLifeAnalyzer {
  /**
   * Build pattern of life from historical data
   */
  buildPattern(
    identityId: string,
    locations: LocationRecord[],
    activities: Array<{ timestamp: string; activity: string; location?: string }>
  ): PatternOfLife {
    // Analyze daily routine
    const weekdayActivities: Map<number, { activity: string; count: number }[]> = new Map();
    const weekendActivities: Map<number, { activity: string; count: number }[]> = new Map();

    for (const activity of activities) {
      const date = new Date(activity.timestamp);
      const hour = date.getHours();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const map = isWeekend ? weekendActivities : weekdayActivities;

      const hourActivities = map.get(hour) || [];
      const existing = hourActivities.find(a => a.activity === activity.activity);
      if (existing) {
        existing.count++;
      } else {
        hourActivities.push({ activity: activity.activity, count: 1 });
      }
      map.set(hour, hourActivities);
    }

    // Build routine
    const buildRoutine = (map: Map<number, { activity: string; count: number }[]>) => {
      const routine: Array<{ hour: number; activity: string; confidence: number }> = [];
      for (const [hour, acts] of map) {
        const total = acts.reduce((sum, a) => sum + a.count, 0);
        const mostCommon = acts.sort((a, b) => b.count - a.count)[0];
        if (mostCommon) {
          routine.push({
            hour,
            activity: mostCommon.activity,
            confidence: mostCommon.count / total
          });
        }
      }
      return routine.sort((a, b) => a.hour - b.hour);
    };

    // Find key locations
    const locationCounts = new Map<string, { location: LocationRecord; count: number; totalDuration: number }>();
    for (const loc of locations) {
      const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
      const existing = locationCounts.get(key);
      if (existing) {
        existing.count++;
        existing.totalDuration += loc.duration || 0;
      } else {
        locationCounts.set(key, { location: loc, count: 1, totalDuration: loc.duration || 0 });
      }
    }

    const keyLocations = [...locationCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((loc, idx) => ({
        type: (idx === 0 ? 'HOME' : idx === 1 ? 'WORK' : 'FREQUENT') as 'HOME' | 'WORK' | 'FREQUENT',
        location: loc.location,
        visitPattern: loc.count > 20 ? 'DAILY' : loc.count > 5 ? 'WEEKLY' : 'OCCASIONAL',
        avgVisitsPerWeek: loc.count / 4 // Assuming 4 weeks of data
      }));

    return {
      identityId,
      dailyRoutine: {
        weekday: buildRoutine(weekdayActivities),
        weekend: buildRoutine(weekendActivities)
      },
      keyLocations,
      associations: [],
      communicationPatterns: {
        peakHours: [9, 14, 19],
        preferredChannels: ['email', 'phone'],
        avgMessagesPerDay: 10
      },
      behavioralBaseline: {
        normalActivity: ['work', 'commute', 'home'],
        deviationThreshold: 0.3
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Detect anomalies in behavior
   */
  detectAnomalies(
    pattern: PatternOfLife,
    currentActivity: { timestamp: string; activity: string; location?: LocationRecord }
  ): Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }> {
    const anomalies: Array<{ type: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }> = [];
    const date = new Date(currentActivity.timestamp);
    const hour = date.getHours();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const routine = isWeekend ? pattern.dailyRoutine.weekend : pattern.dailyRoutine.weekday;
    const expectedActivity = routine.find(r => r.hour === hour);

    // Activity anomaly
    if (expectedActivity && expectedActivity.activity !== currentActivity.activity) {
      if (expectedActivity.confidence > 0.8) {
        anomalies.push({
          type: 'UNEXPECTED_ACTIVITY',
          description: `Expected ${expectedActivity.activity} but observed ${currentActivity.activity}`,
          severity: 'MEDIUM'
        });
      }
    }

    // Location anomaly
    if (currentActivity.location) {
      const isKnownLocation = pattern.keyLocations.some(kl =>
        Math.abs(kl.location.coordinates.latitude - currentActivity.location!.coordinates.latitude) < 0.01 &&
        Math.abs(kl.location.coordinates.longitude - currentActivity.location!.coordinates.longitude) < 0.01
      );

      if (!isKnownLocation) {
        anomalies.push({
          type: 'UNKNOWN_LOCATION',
          description: 'Subject at previously unobserved location',
          severity: 'LOW'
        });
      }
    }

    return anomalies;
  }
}

// ============================================================================
// Intelligence Product Generator
// ============================================================================

export class IntelligenceProductGenerator {
  /**
   * Generate a comprehensive profile
   */
  generateProfile(
    poi: PersonOfInterest,
    networkAnalysis: NetworkAnalysis,
    patternOfLife: PatternOfLife,
    movementHistory: MovementHistory
  ): IntelligenceProduct {
    const keyFindings: string[] = [];
    const recommendations: string[] = [];

    // Analyze risk
    if (poi.riskLevel === 'CRITICAL' || poi.riskLevel === 'HIGH') {
      keyFindings.push(`Subject classified as ${poi.riskLevel} risk with score ${poi.riskScore}`);
      recommendations.push('Maintain active surveillance');
    }

    // Analyze network
    if (networkAnalysis.metrics.degree > 10) {
      keyFindings.push(`Subject has extensive network (${networkAnalysis.metrics.degree} connections)`);
    }

    // Analyze movement
    if (movementHistory.anomalies.length > 0) {
      keyFindings.push(`${movementHistory.anomalies.length} movement anomalies detected`);
      recommendations.push('Review movement anomalies for potential intelligence value');
    }

    // Analyze pattern of life
    if (patternOfLife.keyLocations.length > 0) {
      keyFindings.push(`Primary locations identified: ${patternOfLife.keyLocations.map(l => l.type).join(', ')}`);
    }

    return {
      productId: crypto.randomUUID(),
      type: 'PROFILE',
      classification: poi.riskLevel === 'CRITICAL' ? 'SECRET' : 'CONFIDENTIAL',
      subjects: [poi.identityId],
      title: `Intelligence Profile: Subject ${poi.identityId.substring(0, 8)}`,
      summary: `Comprehensive intelligence profile for ${poi.classification} subject with ${poi.riskLevel} risk level.`,
      content: {
        sections: [
          {
            title: 'Subject Overview',
            content: `Classification: ${poi.classification}\nRisk Level: ${poi.riskLevel}\nStatus: ${poi.currentStatus}`
          },
          {
            title: 'Network Analysis',
            content: `Connections: ${networkAnalysis.metrics.degree}\nClustering: ${networkAnalysis.metrics.clusteringCoefficient.toFixed(2)}`
          },
          {
            title: 'Pattern of Life',
            content: `Key locations: ${patternOfLife.keyLocations.length}\nLast updated: ${patternOfLife.lastUpdated}`
          },
          {
            title: 'Threat Assessment',
            content: `Indicators: ${poi.threatIndicators.length}\nRisk Score: ${poi.riskScore}/100`
          }
        ]
      },
      keyFindings,
      recommendations,
      sources: [
        { name: 'Biometric Database', reliability: 'B', credibility: '2' },
        { name: 'Travel Records', reliability: 'A', credibility: '1' },
        { name: 'Communication Intercepts', reliability: 'C', credibility: '3' }
      ],
      dissemination: ['INTELLIGENCE_ANALYSTS', 'FIELD_OFFICERS'],
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    };
  }
}

export default PersonOfInterestTracker;
