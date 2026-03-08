"use strict";
/**
 * @intelgraph/audio-intelligence
 *
 * Audio event detection and acoustic intelligence including:
 * - Gunshot detection
 * - Glass break detection
 * - Scream and distress detection
 * - Vehicle sound classification
 * - Acoustic event detection
 * - Sound source localization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleClassificationSchema = exports.GunshotDetectionResultSchema = exports.AcousticEventSchema = exports.AcousticEventType = void 0;
const zod_1 = require("zod");
var AcousticEventType;
(function (AcousticEventType) {
    AcousticEventType["GUNSHOT"] = "gunshot";
    AcousticEventType["EXPLOSION"] = "explosion";
    AcousticEventType["GLASS_BREAK"] = "glass_break";
    AcousticEventType["SCREAM"] = "scream";
    AcousticEventType["ALARM"] = "alarm";
    AcousticEventType["SIREN"] = "siren";
    AcousticEventType["DOG_BARK"] = "dog_bark";
    AcousticEventType["VEHICLE"] = "vehicle";
    AcousticEventType["FOOTSTEPS"] = "footsteps";
    AcousticEventType["DOOR_SLAM"] = "door_slam";
    AcousticEventType["UNKNOWN"] = "unknown";
})(AcousticEventType || (exports.AcousticEventType = AcousticEventType = {}));
exports.AcousticEventSchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(AcousticEventType),
    startTime: zod_1.z.number(),
    endTime: zod_1.z.number(),
    confidence: zod_1.z.number().min(0).max(1),
    location: zod_1.z.object({
        azimuth: zod_1.z.number().optional(),
        elevation: zod_1.z.number().optional(),
        distance: zod_1.z.number().optional()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional()
});
exports.GunshotDetectionResultSchema = zod_1.z.object({
    detected: zod_1.z.boolean(),
    events: zod_1.z.array(exports.AcousticEventSchema),
    weaponType: zod_1.z.string().optional(),
    caliber: zod_1.z.string().optional(),
    numberOfShots: zod_1.z.number().int()
});
exports.VehicleClassificationSchema = zod_1.z.object({
    vehicleType: zod_1.z.enum(['car', 'truck', 'motorcycle', 'bus', 'emergency_vehicle', 'aircraft']),
    confidence: zod_1.z.number().min(0).max(1),
    speed: zod_1.z.number().optional(),
    direction: zod_1.z.enum(['approaching', 'receding', 'passing']).optional()
});
