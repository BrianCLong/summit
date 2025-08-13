const geolib = require('geolib');
const turf = require('turf');
const logger = require('../utils/logger');

class GeointService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Calculate distance between two geographic points
   */
  calculateDistance(point1, point2, unit = 'km') {
    try {
      const distance = geolib.getDistance(point1, point2);
      
      switch (unit) {
        case 'km':
          return distance / 1000;
        case 'miles':
          return distance * 0.000621371;
        case 'm':
        default:
          return distance;
      }
    } catch (error) {
      this.logger.error('Error calculating distance:', error);
      throw error;
    }
  }

  /**
   * Determine if a point is within a geographic boundary
   */
  isPointInBoundary(point, boundary) {
    try {
      const pointFeature = turf.point([point.longitude, point.latitude]);
      const polygon = turf.polygon([boundary]);
      return turf.booleanPointInPolygon(pointFeature, polygon);
    } catch (error) {
      this.logger.error('Error checking point in boundary:', error);
      throw error;
    }
  }

  /**
   * Find all points within a radius of a center point
   */
  findPointsWithinRadius(centerPoint, points, radius, unit = 'km') {
    try {
      return points.filter(point => {
        const distance = this.calculateDistance(centerPoint, point, unit);
        return distance <= radius;
      });
    } catch (error) {
      this.logger.error('Error finding points within radius:', error);
      throw error;
    }
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(point1, point2) {
    try {
      return geolib.getBearing(point1, point2);
    } catch (error) {
      this.logger.error('Error calculating bearing:', error);
      throw error;
    }
  }

  /**
   * Create a geofence around a point
   */
  createGeofence(centerPoint, radius, sides = 12) {
    try {
      const coordinates = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 360) / sides;
        const point = geolib.computeDestinationPoint(centerPoint, radius * 1000, angle);
        coordinates.push([point.longitude, point.latitude]);
      }
      coordinates.push(coordinates[0]); // Close the polygon
      
      return turf.polygon([coordinates]);
    } catch (error) {
      this.logger.error('Error creating geofence:', error);
      throw error;
    }
  }

  /**
   * Analyze movement patterns from a series of location points
   */
  analyzeMovementPattern(locationHistory) {
    try {
      if (locationHistory.length < 2) {
        return { error: 'Need at least 2 points for pattern analysis' };
      }

      let totalDistance = 0;
      let totalTime = 0;
      const bearings = [];
      const speeds = [];
      
      for (let i = 1; i < locationHistory.length; i++) {
        const prev = locationHistory[i - 1];
        const curr = locationHistory[i];
        
        const distance = this.calculateDistance(prev, curr, 'km');
        const bearing = this.calculateBearing(prev, curr);
        const timeDiff = new Date(curr.timestamp) - new Date(prev.timestamp);
        const hours = timeDiff / (1000 * 60 * 60);
        const speed = distance / hours;
        
        totalDistance += distance;
        totalTime += timeDiff;
        bearings.push(bearing);
        speeds.push(speed);
      }

      const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const maxSpeed = Math.max(...speeds);
      const avgBearing = bearings.reduce((a, b) => a + b, 0) / bearings.length;

      return {
        totalDistance,
        totalTime: totalTime / 1000, // in seconds
        averageSpeed: avgSpeed,
        maxSpeed,
        averageBearing: avgBearing,
        speedVariance: this.calculateVariance(speeds),
        bearingVariance: this.calculateVariance(bearings)
      };
    } catch (error) {
      this.logger.error('Error analyzing movement pattern:', error);
      throw error;
    }
  }

  /**
   * Detect potential clusters of activity
   */
  detectActivityClusters(points, epsilon = 0.1, minPoints = 3) {
    try {
      const clusters = [];
      const visited = new Set();
      const noise = [];

      for (let i = 0; i < points.length; i++) {
        if (visited.has(i)) continue;
        
        const neighbors = this.getNeighbors(points, i, epsilon);
        
        if (neighbors.length < minPoints) {
          noise.push(points[i]);
        } else {
          const cluster = [];
          this.expandCluster(points, i, neighbors, cluster, visited, epsilon, minPoints);
          clusters.push(cluster);
        }
      }

      return { clusters, noise };
    } catch (error) {
      this.logger.error('Error detecting activity clusters:', error);
      throw error;
    }
  }

  /**
   * Helper method for cluster detection
   */
  getNeighbors(points, pointIndex, epsilon) {
    const neighbors = [];
    const currentPoint = points[pointIndex];
    
    for (let i = 0; i < points.length; i++) {
      if (i === pointIndex) continue;
      const distance = this.calculateDistance(currentPoint, points[i], 'km');
      if (distance <= epsilon) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  /**
   * Helper method for expanding clusters
   */
  expandCluster(points, pointIndex, neighbors, cluster, visited, epsilon, minPoints) {
    cluster.push(points[pointIndex]);
    visited.add(pointIndex);
    
    for (const neighborIndex of neighbors) {
      if (!visited.has(neighborIndex)) {
        visited.add(neighborIndex);
        const neighborNeighbors = this.getNeighbors(points, neighborIndex, epsilon);
        
        if (neighborNeighbors.length >= minPoints) {
          neighbors.push(...neighborNeighbors);
        }
      }
      
      if (!cluster.some(p => p === points[neighborIndex])) {
        cluster.push(points[neighborIndex]);
      }
    }
  }

  /**
   * Calculate variance for statistical analysis
   */
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  /**
   * Geocode address to coordinates (placeholder for external service integration)
   */
  async geocodeAddress(address) {
    // This would integrate with a geocoding service like Google Maps, OpenStreetMap, etc.
    this.logger.info(`Geocoding address: ${address}`);
    
    // Placeholder implementation
    return {
      address,
      coordinates: null,
      confidence: 0,
      error: 'Geocoding service not implemented'
    };
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    // This would integrate with a reverse geocoding service
    this.logger.info(`Reverse geocoding: ${latitude}, ${longitude}`);
    
    // Placeholder implementation
    return {
      coordinates: { latitude, longitude },
      address: null,
      confidence: 0,
      error: 'Reverse geocoding service not implemented'
    };
  }
}

module.exports = GeointService;