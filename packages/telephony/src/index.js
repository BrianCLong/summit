"use strict";
/**
 * @intelgraph/telephony
 *
 * Telephony and communications integration including:
 * - Call recording integration
 * - PBX system integration
 * - SIP protocol support
 * - WebRTC audio streams
 * - Call quality metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DTMFEventSchema = exports.CallQualityMetricsSchema = exports.CallMetadataSchema = exports.CallStatus = exports.CallDirection = void 0;
const zod_1 = require("zod");
var CallDirection;
(function (CallDirection) {
    CallDirection["INBOUND"] = "inbound";
    CallDirection["OUTBOUND"] = "outbound";
})(CallDirection || (exports.CallDirection = CallDirection = {}));
var CallStatus;
(function (CallStatus) {
    CallStatus["INITIATED"] = "initiated";
    CallStatus["RINGING"] = "ringing";
    CallStatus["CONNECTED"] = "connected";
    CallStatus["ON_HOLD"] = "on_hold";
    CallStatus["TRANSFERRED"] = "transferred";
    CallStatus["ENDED"] = "ended";
    CallStatus["FAILED"] = "failed";
})(CallStatus || (exports.CallStatus = CallStatus = {}));
exports.CallMetadataSchema = zod_1.z.object({
    callId: zod_1.z.string(),
    direction: zod_1.z.nativeEnum(CallDirection),
    callerNumber: zod_1.z.string(),
    calleeNumber: zod_1.z.string(),
    startTime: zod_1.z.date(),
    endTime: zod_1.z.date().optional(),
    duration: zod_1.z.number().optional(),
    status: zod_1.z.nativeEnum(CallStatus),
    codec: zod_1.z.string(),
    recordingUrl: zod_1.z.string().optional()
});
exports.CallQualityMetricsSchema = zod_1.z.object({
    mos: zod_1.z.number().min(1).max(5).describe('Mean Opinion Score'),
    rFactor: zod_1.z.number(),
    jitter: zod_1.z.number().describe('Jitter in ms'),
    packetLoss: zod_1.z.number().min(0).max(100).describe('Packet loss percentage'),
    latency: zod_1.z.number().describe('Latency in ms'),
    bitrate: zod_1.z.number(),
    audioClarity: zod_1.z.number().min(0).max(1)
});
exports.DTMFEventSchema = zod_1.z.object({
    digit: zod_1.z.string().regex(/^[0-9*#ABCD]$/),
    timestamp: zod_1.z.number(),
    duration: zod_1.z.number()
});
