export type SignalQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'DECEPTIVE';
export type SensorMode = 'PASSIVE_WATCH' | 'EARLY_WARNING' | 'POISONING_INDICATOR';

export interface CoverageRegion {
  node_ids: string[];
  relation_types: string[];
}

export interface CounterSensor {
  sensor_id: string;
  backing_assets: string[];
  coverage_region: CoverageRegion;
  signal_quality: SignalQuality;
  sensor_mode: SensorMode;
}

export class CounterSensorNetwork {
  sensors: CounterSensor[];

  constructor(sensors: CounterSensor[] = []) {
    this.sensors = sensors;
  }

  addSensor(sensor: CounterSensor) {
    this.sensors.push(sensor);
  }

  /**
   * Compute overlap of coverage between two specific sensors
   */
  getCoverageOverlap(sensor1Id: string, sensor2Id: string): CoverageRegion {
    const s1 = this.sensors.find(s => s.sensor_id === sensor1Id);
    const s2 = this.sensors.find(s => s.sensor_id === sensor2Id);

    if (!s1 || !s2) {
      return { node_ids: [], relation_types: [] };
    }

    const s1Nodes = new Set(s1.coverage_region.node_ids);
    const s1Relations = new Set(s1.coverage_region.relation_types);

    const overlapNodes = s2.coverage_region.node_ids.filter(node => s1Nodes.has(node));
    const overlapRelations = s2.coverage_region.relation_types.filter(rel => s1Relations.has(rel));

    return {
      node_ids: overlapNodes,
      relation_types: overlapRelations,
    };
  }

  /**
   * Identify blind spots: communities or relation types with no or only DECEPTIVE coverage
   * Requires providing the target full list of nodes and relation types to check against.
   */
  identifyBlindSpots(targetNodes: string[], targetRelationTypes: string[]): CoverageRegion {
    const validSensors = this.sensors.filter(s => s.signal_quality !== 'DECEPTIVE');

    const coveredNodes = new Set<string>();
    const coveredRelations = new Set<string>();

    validSensors.forEach(s => {
      s.coverage_region.node_ids.forEach(n => coveredNodes.add(n));
      s.coverage_region.relation_types.forEach(r => coveredRelations.add(r));
    });

    const blindNodes = targetNodes.filter(n => !coveredNodes.has(n));
    const blindRelations = targetRelationTypes.filter(r => !coveredRelations.has(r));

    return {
      node_ids: blindNodes,
      relation_types: blindRelations,
    };
  }

  /**
   * Identify fragile coverage: nodes or relations that are only covered by a single sensor.
   */
  identifyFragileCoverage(): { node_ids: string[], relation_types: string[] } {
    const nodeCoverageCount: Record<string, number> = {};
    const relationCoverageCount: Record<string, number> = {};

    this.sensors.forEach(s => {
      s.coverage_region.node_ids.forEach(n => {
        nodeCoverageCount[n] = (nodeCoverageCount[n] || 0) + 1;
      });
      s.coverage_region.relation_types.forEach(r => {
        relationCoverageCount[r] = (relationCoverageCount[r] || 0) + 1;
      });
    });

    const fragileNodes = Object.entries(nodeCoverageCount)
      .filter(([_, count]) => count === 1)
      .map(([node, _]) => node);

    const fragileRelations = Object.entries(relationCoverageCount)
      .filter(([_, count]) => count === 1)
      .map(([rel, _]) => rel);

    return {
      node_ids: fragileNodes,
      relation_types: fragileRelations,
    };
  }
}
