import { haversineDistance } from '../utils/distance.js';
import { pointInGeometry } from '../utils/geometry.js';
import type { GeoPoint, Route, RouteSegment, Geofence } from '../types/geospatial.js';

interface GraphNode {
  id: string;
  point: GeoPoint;
  edges: GraphEdge[];
}

interface GraphEdge {
  to: string;
  weight: number;
}

export interface RouteOptions {
  averageSpeedMps?: number;
  avoidGeofences?: Geofence[];
}

export class RouteGraph {
  private nodes = new Map<string, GraphNode>();

  addNode(id: string, point: GeoPoint): this {
    this.nodes.set(id, { id, point, edges: [] });
    return this;
  }

  addEdge(from: string, to: string, weight?: number): this {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    if (!fromNode || !toNode) {
      throw new Error('Both nodes must exist before adding an edge');
    }
    const distance = weight ?? haversineDistance(fromNode.point, toNode.point);
    fromNode.edges.push({ to, weight: distance });
    return this;
  }

  shortestPath(start: string, goal: string): string[] {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set(this.nodes.keys());

    this.nodes.forEach((_, id) => {
      distances.set(id, id === start ? 0 : Number.POSITIVE_INFINITY);
      previous.set(id, null);
    });

    while (unvisited.size) {
      let current: string | null = null;
      unvisited.forEach((candidate) => {
        if (current === null || (distances.get(candidate) ?? Infinity) < (distances.get(current) ?? Infinity)) {
          current = candidate;
        }
      });

      if (current === null) break;
      if (current === goal) break;
      const currentId = current;
      unvisited.delete(currentId);

      const node = this.nodes.get(currentId);
      if (!node) continue;
      node.edges.forEach((edge) => {
        if (!unvisited.has(edge.to)) return;
        const alt = (distances.get(currentId) ?? Infinity) + edge.weight;
        if (alt < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, alt);
          previous.set(edge.to, currentId);
        }
      });
    }

    const path: string[] = [];
    let current: string | null = goal;
    while (current) {
      path.unshift(current);
      current = previous.get(current) ?? null;
    }
    return path;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }
}

const crossesGeofence = (start: GeoPoint, end: GeoPoint, geofence: Geofence): boolean => {
  const startInside = pointInGeometry(start, geofence.geometry);
  const endInside = pointInGeometry(end, geofence.geometry);
  return startInside !== endInside;
};

export const optimizeRoute = (
  graph: RouteGraph,
  waypoints: string[],
  options: RouteOptions = {}
): Route => {
  const speed = options.averageSpeedMps ?? 13.9;
  const segments: RouteSegment[] = [];
  const geometry: Array<[number, number]> = [];
  const geofences = options.avoidGeofences || [];

  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const path = graph.shortestPath(start, end);

    for (let j = 0; j < path.length - 1; j += 1) {
      const fromNode = graph.getNode(path[j]);
      const toNode = graph.getNode(path[j + 1]);
      if (!fromNode || !toNode) continue;

      const blocked = geofences.some((fence) => crossesGeofence(fromNode.point, toNode.point, fence));
      if (blocked) {
        continue;
      }

      const distance = haversineDistance(fromNode.point, toNode.point);
      geometry.push([fromNode.point.longitude, fromNode.point.latitude]);
      segments.push({
        id: `${path[j]}-${path[j + 1]}`,
        start: fromNode.point,
        end: toNode.point,
        distance,
        duration: distance / speed,
        geometry: [
          [fromNode.point.longitude, fromNode.point.latitude],
          [toNode.point.longitude, toNode.point.latitude],
        ],
      });
    }
  }

  if (waypoints.length) {
    const lastNode = graph.getNode(waypoints[waypoints.length - 1]);
    if (lastNode) {
      geometry.push([lastNode.point.longitude, lastNode.point.latitude]);
    }
  }

  const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
  const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

  return {
    id: `route-${Date.now()}`,
    segments,
    totalDistance,
    totalDuration,
    waypoints: waypoints
      .map((id) => graph.getNode(id)?.point)
      .filter((p): p is GeoPoint => Boolean(p)),
    geometry,
  };
};
