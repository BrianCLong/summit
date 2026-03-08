"use strict";
/**
 * SIGINT/MASINT Intelligence Types
 *
 * Type definitions for spectrum analysis, sensor fusion, and
 * intelligence correlation against ODNI intelligence gaps.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelAlertSchema = exports.SensorReadingSchema = exports.SpectrumSampleSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================
exports.SpectrumSampleSchema = zod_1.z.object({
    timestamp: zod_1.z.date(),
    frequencyHz: zod_1.z.number().positive(),
    bandwidthHz: zod_1.z.number().positive(),
    powerDbm: zod_1.z.number(),
    noiseFloorDbm: zod_1.z.number(),
    sensorId: zod_1.z.string().min(1),
    geolocation: zod_1.z
        .object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        altitudeM: zod_1.z.number().optional(),
        accuracyM: zod_1.z.number().positive(),
        timestamp: zod_1.z.date(),
        source: zod_1.z.enum([
            'GPS',
            'TDOA',
            'AOA',
            'FDOA',
            'HYBRID',
            'ESTIMATED',
        ]),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.SensorReadingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sensorId: zod_1.z.string().min(1),
    modality: zod_1.z.enum([
        'RADAR',
        'ELECTRO_OPTICAL',
        'INFRARED',
        'ACOUSTIC',
        'SEISMIC',
        'MAGNETIC',
        'NUCLEAR',
        'CHEMICAL',
        'MULTISPECTRAL',
        'HYPERSPECTRAL',
        'LIDAR',
        'SAR',
    ]),
    timestamp: zod_1.z.date(),
    value: zod_1.z.union([zod_1.z.number(), zod_1.z.array(zod_1.z.number())]),
    unit: zod_1.z.string(),
    qualityScore: zod_1.z.number().min(0).max(1),
    geolocation: zod_1.z
        .object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        altitudeM: zod_1.z.number().optional(),
        accuracyM: zod_1.z.number().positive(),
        timestamp: zod_1.z.date(),
        source: zod_1.z.enum([
            'GPS',
            'TDOA',
            'AOA',
            'FDOA',
            'HYBRID',
            'ESTIMATED',
        ]),
    })
        .optional(),
    bearing: zod_1.z.number().min(0).max(360).optional(),
    range: zod_1.z.number().positive().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.IntelAlertSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum([
        'NEW_SIGNAL',
        'SIGNAL_CHANGE',
        'NEW_TRACK',
        'TRACK_MANEUVER',
        'SIGNATURE_MATCH',
        'THREAT_DETECTED',
        'CORRELATION_FOUND',
        'ODNI_GAP_HIT',
        'ANOMALY_DETECTED',
        'PATTERN_MATCH',
    ]),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'FLASH']),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    source: zod_1.z.enum(['SIGINT', 'MASINT', 'FUSION', 'CORRELATION']),
    relatedEntityIds: zod_1.z.array(zod_1.z.string()),
    relatedSignalIds: zod_1.z.array(zod_1.z.string()),
    relatedTrackIds: zod_1.z.array(zod_1.z.string()),
    odniGapReferences: zod_1.z.array(zod_1.z.string()),
    geolocation: zod_1.z
        .object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        altitudeM: zod_1.z.number().optional(),
        accuracyM: zod_1.z.number().positive(),
        timestamp: zod_1.z.date(),
        source: zod_1.z.enum([
            'GPS',
            'TDOA',
            'AOA',
            'FDOA',
            'HYBRID',
            'ESTIMATED',
        ]),
    })
        .optional(),
    timestamp: zod_1.z.date(),
    expiresAt: zod_1.z.date().optional(),
    acknowledged: zod_1.z.boolean(),
    acknowledgedBy: zod_1.z.string().optional(),
    acknowledgedAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
