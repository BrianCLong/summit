/**
 * Triangulator - Multi-method geolocation
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface BearingMeasurement {
  sensorId: string;
  sensorLocation: { latitude: number; longitude: number };
  bearing: number; // degrees from north
  accuracy: number; // degrees
  timestamp: Date;
}

export interface RSSIMeasurement {
  sensorId: string;
  sensorLocation: { latitude: number; longitude: number };
  rssi: number; // dBm
  frequency: number;
  pathLossExponent: number;
  referenceDistance: number;
  referencePower: number;
  timestamp: Date;
}

export interface CellTowerMeasurement {
  towerId: string;
  location: { latitude: number; longitude: number };
  mcc: number; // Mobile Country Code
  mnc: number; // Mobile Network Code
  lac: number; // Location Area Code
  cellId: number;
  signalStrength: number;
  timingAdvance?: number;
  timestamp: Date;
}

export interface TriangulationResult {
  id: string;
  method: 'AOA' | 'RSSI' | 'CELL' | 'HYBRID';
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  confidence: number;
  measurements: number;
  timestamp: Date;
  details: {
    errorEllipse?: {
      semiMajor: number;
      semiMinor: number;
      orientation: number;
    };
    geometricDOP?: number;
    residualError?: number;
  };
  isSimulated: boolean;
}

export class Triangulator {
  private earthRadius = 6371000; // meters

  /**
   * Angle of Arrival (AOA) triangulation
   */
  triangulateAOA(bearings: BearingMeasurement[]): TriangulationResult | null {
    if (bearings.length < 2) {
      console.warn('[TRIANGULATION] AOA requires at least 2 bearing measurements');
      return null;
    }

    // Find intersections of bearing lines
    const intersections: Array<{ lat: number; lon: number; weight: number }> = [];

    for (let i = 0; i < bearings.length; i++) {
      for (let j = i + 1; j < bearings.length; j++) {
        const intersection = this.findBearingIntersection(
          bearings[i].sensorLocation,
          bearings[i].bearing,
          bearings[j].sensorLocation,
          bearings[j].bearing
        );

        if (intersection) {
          // Weight by bearing accuracy
          const weight = 1 / (bearings[i].accuracy + bearings[j].accuracy);
          intersections.push({ ...intersection, weight });
        }
      }
    }

    if (intersections.length === 0) {
      return null;
    }

    // Weighted average of intersections
    let totalWeight = 0;
    let lat = 0, lon = 0;

    for (const int of intersections) {
      lat += int.lat * int.weight;
      lon += int.lon * int.weight;
      totalWeight += int.weight;
    }

    lat /= totalWeight;
    lon /= totalWeight;

    // Calculate accuracy from spread of intersections
    const distances = intersections.map(int =>
      this.calculateDistance(lat, lon, int.lat, int.lon)
    );
    const accuracy = Math.sqrt(
      distances.reduce((sum, d) => sum + d * d, 0) / distances.length
    );

    // Calculate GDOP from geometry
    const gdop = this.calculateGDOP(
      { latitude: lat, longitude: lon },
      bearings.map(b => b.sensorLocation)
    );

    return {
      id: uuid(),
      method: 'AOA',
      latitude: lat,
      longitude: lon,
      accuracy: accuracy * gdop,
      confidence: Math.max(0, 1 - (accuracy * gdop) / 1000),
      measurements: bearings.length,
      timestamp: new Date(),
      details: {
        geometricDOP: gdop,
        residualError: accuracy
      },
      isSimulated: true
    };
  }

  /**
   * RSSI-based triangulation
   */
  triangulateRSSI(measurements: RSSIMeasurement[]): TriangulationResult | null {
    if (measurements.length < 3) {
      console.warn('[TRIANGULATION] RSSI requires at least 3 measurements');
      return null;
    }

    // Calculate distances from RSSI using path loss model
    const distances = measurements.map(m => {
      // Path loss model: RSSI = P0 - 10 * n * log10(d/d0)
      // Solving for d: d = d0 * 10^((P0 - RSSI) / (10 * n))
      const exponent = (m.referencePower - m.rssi) / (10 * m.pathLossExponent);
      return {
        location: m.sensorLocation,
        distance: m.referenceDistance * Math.pow(10, exponent)
      };
    });

    // Trilateration using least squares
    const result = this.trilaterate(distances);

    if (!result) return null;

    return {
      id: uuid(),
      method: 'RSSI',
      latitude: result.lat,
      longitude: result.lon,
      accuracy: result.accuracy,
      confidence: Math.max(0, 1 - result.accuracy / 500),
      measurements: measurements.length,
      timestamp: new Date(),
      details: {
        residualError: result.accuracy
      },
      isSimulated: true
    };
  }

  /**
   * Cell tower triangulation
   */
  triangulateCellTowers(cells: CellTowerMeasurement[]): TriangulationResult | null {
    if (cells.length < 1) {
      return null;
    }

    // Sort by signal strength
    const sortedCells = [...cells].sort((a, b) => b.signalStrength - a.signalStrength);

    if (cells.length === 1) {
      // Single cell - use timing advance if available
      const cell = sortedCells[0];
      let accuracy = 2000; // Default 2km

      if (cell.timingAdvance !== undefined) {
        // TA in GSM: distance = TA * 550m (approx)
        accuracy = cell.timingAdvance * 550;
      }

      return {
        id: uuid(),
        method: 'CELL',
        latitude: cell.location.latitude,
        longitude: cell.location.longitude,
        accuracy,
        confidence: 0.3,
        measurements: 1,
        timestamp: new Date(),
        details: {},
        isSimulated: true
      };
    }

    // Multiple cells - estimate distance from signal strength
    const distances = sortedCells.map(cell => {
      // Approximate distance from signal strength
      // Assuming -50dBm at 100m, -110dBm at 35km
      const maxDist = 35000;
      const minSignal = -110;
      const maxSignal = -50;

      const ratio = (cell.signalStrength - minSignal) / (maxSignal - minSignal);
      const distance = maxDist * Math.pow(1 - ratio, 2);

      return {
        location: cell.location,
        distance: Math.max(100, distance)
      };
    });

    const result = this.trilaterate(distances);

    if (!result) {
      // Fallback to weighted centroid
      let totalWeight = 0;
      let lat = 0, lon = 0;

      for (const cell of sortedCells) {
        const weight = Math.pow(10, cell.signalStrength / 20);
        lat += cell.location.latitude * weight;
        lon += cell.location.longitude * weight;
        totalWeight += weight;
      }

      return {
        id: uuid(),
        method: 'CELL',
        latitude: lat / totalWeight,
        longitude: lon / totalWeight,
        accuracy: 1000,
        confidence: 0.4,
        measurements: cells.length,
        timestamp: new Date(),
        details: {},
        isSimulated: true
      };
    }

    return {
      id: uuid(),
      method: 'CELL',
      latitude: result.lat,
      longitude: result.lon,
      accuracy: result.accuracy,
      confidence: Math.max(0.3, 1 - result.accuracy / 2000),
      measurements: cells.length,
      timestamp: new Date(),
      details: {
        residualError: result.accuracy
      },
      isSimulated: true
    };
  }

  /**
   * Hybrid triangulation combining multiple methods
   */
  triangulateHybrid(
    bearings?: BearingMeasurement[],
    rssi?: RSSIMeasurement[],
    cells?: CellTowerMeasurement[]
  ): TriangulationResult | null {
    const results: TriangulationResult[] = [];

    if (bearings && bearings.length >= 2) {
      const aoaResult = this.triangulateAOA(bearings);
      if (aoaResult) results.push(aoaResult);
    }

    if (rssi && rssi.length >= 3) {
      const rssiResult = this.triangulateRSSI(rssi);
      if (rssiResult) results.push(rssiResult);
    }

    if (cells && cells.length >= 1) {
      const cellResult = this.triangulateCellTowers(cells);
      if (cellResult) results.push(cellResult);
    }

    if (results.length === 0) return null;

    if (results.length === 1) return results[0];

    // Weighted combination based on confidence
    let totalWeight = 0;
    let lat = 0, lon = 0;
    let bestAccuracy = Infinity;

    for (const result of results) {
      const weight = result.confidence / result.accuracy;
      lat += result.latitude * weight;
      lon += result.longitude * weight;
      totalWeight += weight;

      if (result.accuracy < bestAccuracy) {
        bestAccuracy = result.accuracy;
      }
    }

    return {
      id: uuid(),
      method: 'HYBRID',
      latitude: lat / totalWeight,
      longitude: lon / totalWeight,
      accuracy: bestAccuracy * 0.8, // Improvement from fusion
      confidence: Math.min(0.95, Math.max(...results.map(r => r.confidence)) * 1.1),
      measurements: results.reduce((sum, r) => sum + r.measurements, 0),
      timestamp: new Date(),
      details: {
        geometricDOP: this.calculateGDOP(
          { latitude: lat / totalWeight, longitude: lon / totalWeight },
          [
            ...(bearings?.map(b => b.sensorLocation) || []),
            ...(rssi?.map(r => r.sensorLocation) || []),
            ...(cells?.map(c => c.location) || [])
          ]
        )
      },
      isSimulated: true
    };
  }

  /**
   * Generate simulated measurements for training
   */
  generateSimulatedMeasurements(
    targetLocation: { latitude: number; longitude: number },
    method: 'AOA' | 'RSSI' | 'CELL' | 'ALL'
  ): {
    bearings?: BearingMeasurement[];
    rssi?: RSSIMeasurement[];
    cells?: CellTowerMeasurement[];
  } {
    const result: {
      bearings?: BearingMeasurement[];
      rssi?: RSSIMeasurement[];
      cells?: CellTowerMeasurement[];
    } = {};

    if (method === 'AOA' || method === 'ALL') {
      result.bearings = this.generateSimulatedBearings(targetLocation, 3);
    }

    if (method === 'RSSI' || method === 'ALL') {
      result.rssi = this.generateSimulatedRSSI(targetLocation, 4);
    }

    if (method === 'CELL' || method === 'ALL') {
      result.cells = this.generateSimulatedCellTowers(targetLocation, 3);
    }

    return result;
  }

  private generateSimulatedBearings(
    target: { latitude: number; longitude: number },
    count: number
  ): BearingMeasurement[] {
    const bearings: BearingMeasurement[] = [];
    const radius = 0.05; // ~5km

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + Math.random() * 0.5;
      const sensorLat = target.latitude + radius * Math.cos(angle);
      const sensorLon = target.longitude + radius * Math.sin(angle);

      // Calculate true bearing to target
      const trueBearing = this.calculateBearing(
        sensorLat, sensorLon,
        target.latitude, target.longitude
      );

      bearings.push({
        sensorId: `SENSOR-${i + 1}`,
        sensorLocation: { latitude: sensorLat, longitude: sensorLon },
        bearing: trueBearing + (Math.random() - 0.5) * 5, // Add error
        accuracy: 2 + Math.random() * 3,
        timestamp: new Date()
      });
    }

    return bearings;
  }

  private generateSimulatedRSSI(
    target: { latitude: number; longitude: number },
    count: number
  ): RSSIMeasurement[] {
    const measurements: RSSIMeasurement[] = [];
    const radius = 0.03;

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + Math.random() * 0.3;
      const sensorLat = target.latitude + radius * Math.cos(angle);
      const sensorLon = target.longitude + radius * Math.sin(angle);

      const distance = this.calculateDistance(
        sensorLat, sensorLon,
        target.latitude, target.longitude
      );

      // Calculate RSSI using path loss model
      const pathLoss = 10 * 3.5 * Math.log10(distance / 1);
      const rssi = -30 - pathLoss + (Math.random() - 0.5) * 6;

      measurements.push({
        sensorId: `RSSI-${i + 1}`,
        sensorLocation: { latitude: sensorLat, longitude: sensorLon },
        rssi: Math.max(-110, rssi),
        frequency: 2.4e9,
        pathLossExponent: 3.5,
        referenceDistance: 1,
        referencePower: -30,
        timestamp: new Date()
      });
    }

    return measurements;
  }

  private generateSimulatedCellTowers(
    target: { latitude: number; longitude: number },
    count: number
  ): CellTowerMeasurement[] {
    const towers: CellTowerMeasurement[] = [];
    const radius = 0.02;

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + Math.random() * 0.4;
      const towerLat = target.latitude + radius * Math.cos(angle);
      const towerLon = target.longitude + radius * Math.sin(angle);

      const distance = this.calculateDistance(
        towerLat, towerLon,
        target.latitude, target.longitude
      );

      // Signal strength decreases with distance
      const signalStrength = -50 - (distance / 1000) * 2 + (Math.random() - 0.5) * 10;

      towers.push({
        towerId: `TOWER-${i + 1}`,
        location: { latitude: towerLat, longitude: towerLon },
        mcc: 310,
        mnc: 260,
        lac: 1000 + i,
        cellId: 10000 + i * 100,
        signalStrength: Math.max(-110, signalStrength),
        timingAdvance: Math.round(distance / 550),
        timestamp: new Date()
      });
    }

    return towers;
  }

  private findBearingIntersection(
    loc1: { latitude: number; longitude: number },
    bearing1: number,
    loc2: { latitude: number; longitude: number },
    bearing2: number
  ): { lat: number; lon: number } | null {
    const lat1 = loc1.latitude * Math.PI / 180;
    const lon1 = loc1.longitude * Math.PI / 180;
    const lat2 = loc2.latitude * Math.PI / 180;
    const lon2 = loc2.longitude * Math.PI / 180;
    const b1 = bearing1 * Math.PI / 180;
    const b2 = bearing2 * Math.PI / 180;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const dist12 = 2 * Math.asin(Math.sqrt(
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
    ));

    if (Math.abs(dist12) < 1e-10) return null;

    const bearingA = Math.acos(
      (Math.sin(lat2) - Math.sin(lat1) * Math.cos(dist12)) /
      (Math.sin(dist12) * Math.cos(lat1))
    );
    const bearingB = Math.acos(
      (Math.sin(lat1) - Math.sin(lat2) * Math.cos(dist12)) /
      (Math.sin(dist12) * Math.cos(lat2))
    );

    let theta12: number, theta21: number;
    if (Math.sin(dLon) > 0) {
      theta12 = bearingA;
      theta21 = 2 * Math.PI - bearingB;
    } else {
      theta12 = 2 * Math.PI - bearingA;
      theta21 = bearingB;
    }

    const alpha1 = (b1 - theta12 + Math.PI) % (2 * Math.PI) - Math.PI;
    const alpha2 = (theta21 - b2 + Math.PI) % (2 * Math.PI) - Math.PI;

    if (Math.sin(alpha1) === 0 && Math.sin(alpha2) === 0) return null;
    if (Math.sin(alpha1) * Math.sin(alpha2) < 0) return null;

    const alpha3 = Math.acos(
      -Math.cos(alpha1) * Math.cos(alpha2) +
      Math.sin(alpha1) * Math.sin(alpha2) * Math.cos(dist12)
    );

    const dist13 = Math.atan2(
      Math.sin(dist12) * Math.sin(alpha1) * Math.sin(alpha2),
      Math.cos(alpha2) + Math.cos(alpha1) * Math.cos(alpha3)
    );

    const lat3 = Math.asin(
      Math.sin(lat1) * Math.cos(dist13) +
      Math.cos(lat1) * Math.sin(dist13) * Math.cos(b1)
    );

    const dLon13 = Math.atan2(
      Math.sin(b1) * Math.sin(dist13) * Math.cos(lat1),
      Math.cos(dist13) - Math.sin(lat1) * Math.sin(lat3)
    );

    const lon3 = lon1 + dLon13;

    return {
      lat: lat3 * 180 / Math.PI,
      lon: lon3 * 180 / Math.PI
    };
  }

  private trilaterate(
    circles: Array<{ location: { latitude: number; longitude: number }; distance: number }>
  ): { lat: number; lon: number; accuracy: number } | null {
    if (circles.length < 3) return null;

    // Use first 3 circles for initial estimate
    // Then refine with all circles using least squares

    // Convert to Cartesian for calculation
    const refLat = circles[0].location.latitude;
    const refLon = circles[0].location.longitude;

    const points = circles.map(c => ({
      x: (c.location.longitude - refLon) * Math.cos(refLat * Math.PI / 180) * 111320,
      y: (c.location.latitude - refLat) * 110540,
      r: c.distance
    }));

    // Initial estimate using first 3 points
    const [p1, p2, p3] = points;

    const A = 2 * (p2.x - p1.x);
    const B = 2 * (p2.y - p1.y);
    const C = p1.r ** 2 - p2.r ** 2 - p1.x ** 2 + p2.x ** 2 - p1.y ** 2 + p2.y ** 2;
    const D = 2 * (p3.x - p2.x);
    const E = 2 * (p3.y - p2.y);
    const F = p2.r ** 2 - p3.r ** 2 - p2.x ** 2 + p3.x ** 2 - p2.y ** 2 + p3.y ** 2;

    const denom = A * E - B * D;
    if (Math.abs(denom) < 1e-10) return null;

    const x = (C * E - B * F) / denom;
    const y = (A * F - C * D) / denom;

    // Calculate accuracy from residuals
    let residualSum = 0;
    for (const p of points) {
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
      residualSum += (dist - p.r) ** 2;
    }
    const accuracy = Math.sqrt(residualSum / points.length);

    // Convert back to lat/lon
    const lat = refLat + y / 110540;
    const lon = refLon + x / (Math.cos(refLat * Math.PI / 180) * 111320);

    return { lat, lon, accuracy };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = this.earthRadius;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const x = Math.sin(dLon) * Math.cos(lat2Rad);
    const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
  }

  private calculateGDOP(
    position: { latitude: number; longitude: number },
    sensors: Array<{ latitude: number; longitude: number }>
  ): number {
    if (sensors.length < 2) return 10;

    let sumAngleDiff = 0;
    let count = 0;

    for (let i = 0; i < sensors.length; i++) {
      for (let j = i + 1; j < sensors.length; j++) {
        const bearing1 = this.calculateBearing(
          position.latitude, position.longitude,
          sensors[i].latitude, sensors[i].longitude
        );
        const bearing2 = this.calculateBearing(
          position.latitude, position.longitude,
          sensors[j].latitude, sensors[j].longitude
        );

        let angleDiff = Math.abs(bearing1 - bearing2);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        sumAngleDiff += Math.abs(Math.sin(angleDiff * Math.PI / 180));
        count++;
      }
    }

    const avgSin = sumAngleDiff / count;
    return avgSin > 0.1 ? 1 / avgSin : 10;
  }
}
