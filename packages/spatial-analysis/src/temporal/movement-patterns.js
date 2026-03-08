"use strict";
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Movement pattern analysis for tracking entities over time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementAnalyzer = void 0;
const geospatial_1 = require("@intelgraph/geospatial");
/**
 * Analyze movement patterns from a track
 */
class MovementAnalyzer {
    /**
     * Calculate comprehensive movement metrics
     */
    static calculateMetrics(track) {
        if (track.points.length < 2) {
            return {
                totalDistance: 0,
                averageSpeed: 0,
                maxSpeed: 0,
                duration: 0,
                tortuosity: 0,
                averageBearing: 0,
                stops: [],
            };
        }
        const points = track.points;
        let totalDistance = 0;
        let maxSpeed = 0;
        const speeds = [];
        const bearings = [];
        // Calculate segment-wise metrics
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const distance = (0, geospatial_1.haversineDistance)(p1, p2);
            totalDistance += distance;
            if (p1.timestamp && p2.timestamp) {
                const timeDiff = (p2.timestamp.getTime() - p1.timestamp.getTime()) / 1000; // seconds
                if (timeDiff > 0) {
                    const speed = distance / timeDiff;
                    speeds.push(speed);
                    maxSpeed = Math.max(maxSpeed, speed);
                }
            }
            const segmentBearing = (0, geospatial_1.bearing)(p1, p2);
            bearings.push(segmentBearing);
        }
        const duration = points[points.length - 1].timestamp && points[0].timestamp
            ? (points[points.length - 1].timestamp.getTime() - points[0].timestamp.getTime()) / 1000
            : 0;
        const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
        // Calculate tortuosity (how direct the path is)
        const straightLineDistance = (0, geospatial_1.haversineDistance)(points[0], points[points.length - 1]);
        const tortuosity = straightLineDistance > 0 ? totalDistance / straightLineDistance : 1;
        // Calculate average bearing (circular mean)
        const averageBearing = this.circularMean(bearings);
        // Detect stops
        const stops = this.detectStops(points);
        return {
            totalDistance,
            averageSpeed,
            maxSpeed,
            duration,
            tortuosity,
            averageBearing,
            stops,
        };
    }
    /**
     * Detect stops in a movement track
     */
    static detectStops(points, distanceThreshold = 50, // meters
    timeThreshold = 300 // seconds (5 minutes)
    ) {
        const stops = [];
        let stopStart = null;
        let stopEnd = null;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            if (!p1.timestamp || !p2.timestamp) {
                continue;
            }
            const distance = (0, geospatial_1.haversineDistance)(p1, p2);
            if (distance <= distanceThreshold) {
                if (!stopStart) {
                    stopStart = p1;
                }
                stopEnd = p2;
            }
            else {
                if (stopStart && stopEnd && stopStart.timestamp && stopEnd.timestamp) {
                    const duration = (stopEnd.timestamp.getTime() - stopStart.timestamp.getTime()) / 1000;
                    if (duration >= timeThreshold) {
                        stops.push({
                            location: {
                                latitude: stopStart.latitude,
                                longitude: stopStart.longitude,
                            },
                            startTime: stopStart.timestamp,
                            endTime: stopEnd.timestamp,
                            duration,
                        });
                    }
                }
                stopStart = null;
                stopEnd = null;
            }
        }
        // Check final stop
        if (stopStart && stopEnd && stopStart.timestamp && stopEnd.timestamp) {
            const duration = (stopEnd.timestamp.getTime() - stopStart.timestamp.getTime()) / 1000;
            if (duration >= timeThreshold) {
                stops.push({
                    location: {
                        latitude: stopStart.latitude,
                        longitude: stopStart.longitude,
                    },
                    startTime: stopStart.timestamp,
                    endTime: stopEnd.timestamp,
                    duration,
                });
            }
        }
        return stops;
    }
    /**
     * Classify movement pattern
     */
    static classifyPattern(track) {
        const metrics = this.calculateMetrics(track);
        // Stationary pattern
        if (metrics.averageSpeed < 0.1) {
            return {
                type: 'stationary',
                confidence: 0.9,
                description: 'Entity is mostly stationary',
            };
        }
        // Linear pattern (low tortuosity)
        if (metrics.tortuosity < 1.2) {
            return {
                type: 'linear',
                confidence: 0.8,
                description: 'Direct, linear movement pattern',
            };
        }
        // Circular pattern (high tortuosity, returns to origin)
        const startEndDistance = (0, geospatial_1.haversineDistance)(track.points[0], track.points[track.points.length - 1]);
        if (metrics.tortuosity > 2 && startEndDistance < metrics.totalDistance * 0.1) {
            return {
                type: 'circular',
                confidence: 0.7,
                description: 'Circular or looping movement pattern',
            };
        }
        // Random pattern (high tortuosity, many direction changes)
        if (metrics.tortuosity > 2) {
            return {
                type: 'random',
                confidence: 0.6,
                description: 'Random or exploratory movement pattern',
            };
        }
        return {
            type: 'linear',
            confidence: 0.5,
            description: 'General movement pattern',
        };
    }
    /**
     * Detect periodic patterns in movement
     */
    static detectPeriodicity(tracks, locationThreshold = 100 // meters
    ) {
        // Group tracks by location
        const locationClusters = [];
        tracks.forEach((track) => {
            const startPoint = track.points[0];
            let foundCluster = false;
            for (const cluster of locationClusters) {
                const clusterCenter = cluster[0];
                if ((0, geospatial_1.haversineDistance)(startPoint, clusterCenter) <= locationThreshold) {
                    cluster.push(startPoint);
                    foundCluster = true;
                    break;
                }
            }
            if (!foundCluster) {
                locationClusters.push([startPoint]);
            }
        });
        // Find clusters with multiple visits
        const frequentLocations = locationClusters.filter((cluster) => cluster.length >= 3);
        if (frequentLocations.length > 0) {
            return {
                isPeriodic: true,
                locations: frequentLocations.map((cluster) => cluster[0]),
            };
        }
        return {
            isPeriodic: false,
            locations: [],
        };
    }
    /**
     * Calculate circular mean of angles (for bearings)
     */
    static circularMean(angles) {
        if (angles.length === 0) {
            return 0;
        }
        let sumSin = 0;
        let sumCos = 0;
        angles.forEach((angle) => {
            const rad = (angle * Math.PI) / 180;
            sumSin += Math.sin(rad);
            sumCos += Math.cos(rad);
        });
        const meanRad = Math.atan2(sumSin / angles.length, sumCos / angles.length);
        const meanDeg = (meanRad * 180) / Math.PI;
        return meanDeg >= 0 ? meanDeg : meanDeg + 360;
    }
    /**
     * Smooth a movement track using moving average
     */
    static smoothTrack(track, windowSize = 5) {
        if (track.points.length < windowSize) {
            return track;
        }
        const smoothedPoints = [];
        for (let i = 0; i < track.points.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(track.points.length, i + Math.ceil(windowSize / 2));
            const window = track.points.slice(start, end);
            const avgLat = window.reduce((sum, p) => sum + p.latitude, 0) / window.length;
            const avgLon = window.reduce((sum, p) => sum + p.longitude, 0) / window.length;
            smoothedPoints.push({
                latitude: avgLat,
                longitude: avgLon,
                timestamp: track.points[i].timestamp,
            });
        }
        return {
            ...track,
            points: smoothedPoints,
        };
    }
}
exports.MovementAnalyzer = MovementAnalyzer;
