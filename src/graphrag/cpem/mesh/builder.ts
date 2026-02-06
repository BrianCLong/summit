import { FICFZone } from '../canonical/ficf';
import { SICFSensor } from '../canonical/sicf';
import { CPEMGraph, CPEMNode, CPEMEdge } from './schema';
import { computeLineOfSight, computeAcousticCoupling } from './geometry';

export class CPEMBuilder {
  private graph: CPEMGraph = {
    nodes: new Map(),
    edges: []
  };

  public addZones(zones: FICFZone[]) {
    for (const zone of zones) {
      this.graph.nodes.set(zone.zone_id, {
        id: zone.zone_id,
        type: 'ZONE',
        labels: ['Zone', zone.zone_type],
        properties: { ...zone }
      });

      // Adjacency edges
      for (const adjId of zone.adjacency) {
        this.graph.edges.push({
          source: zone.zone_id,
          target: adjId,
          type: 'ADJACENT_TO',
          properties: {}
        });
      }

      // Check acoustic coupling with already added zones (bidirectional check needs full pass or careful ordering)
      // For simplicity in builder, we rely on the input adjacency list which is usually symmetric.
      // We'll compute acoustic coupling edges in a second pass or on demand.
    }
  }

  public addSensors(sensors: SICFSensor[], zones: FICFZone[]) {
    for (const sensor of sensors) {
      this.graph.nodes.set(sensor.sensor_id, {
        id: sensor.sensor_id,
        type: 'SENSOR',
        labels: ['Sensor', sensor.sensor_type],
        properties: { ...sensor }
      });

      // Sensor in Zone
      this.graph.edges.push({
        source: sensor.zone_id,
        target: sensor.sensor_id,
        type: 'CONTAINS',
        properties: {}
      });

      // Line of Sight
      const visibleZoneIds = computeLineOfSight(sensor, zones);
      for (const vzId of visibleZoneIds) {
          this.graph.edges.push({
              source: sensor.sensor_id,
              target: vzId,
              type: 'LINE_OF_SIGHT',
              properties: { coverage: sensor.coverage_model }
          });
      }
    }
  }

  public getSnapshot(): CPEMGraph {
      return this.graph;
  }
}
