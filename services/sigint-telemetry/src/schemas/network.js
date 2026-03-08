"use strict";
/**
 * Network telemetry schemas
 *
 * Covers: flow logs, DNS, HTTP summaries, connection events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkEventSchema = exports.HttpEventSchema = exports.HttpMethod = exports.DnsEventSchema = exports.DnsRecordType = exports.NetworkFlowSchema = exports.TransportProtocol = exports.FlowDirection = void 0;
const zod_1 = require("zod");
const base_js_1 = require("./base.js");
/** Network flow direction */
exports.FlowDirection = zod_1.z.enum(['inbound', 'outbound', 'lateral']);
/** Transport protocol */
exports.TransportProtocol = zod_1.z.enum(['tcp', 'udp', 'icmp', 'sctp']);
/** Network flow log event */
exports.NetworkFlowSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('network.flow'),
    source: base_js_1.NetworkAddressSchema,
    destination: base_js_1.NetworkAddressSchema,
    protocol: exports.TransportProtocol,
    direction: exports.FlowDirection,
    bytesIn: zod_1.z.number().int().nonnegative(),
    bytesOut: zod_1.z.number().int().nonnegative(),
    packetsIn: zod_1.z.number().int().nonnegative(),
    packetsOut: zod_1.z.number().int().nonnegative(),
    durationMs: zod_1.z.number().int().nonnegative(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    action: zod_1.z.enum(['allow', 'deny', 'drop']),
    ruleId: zod_1.z.string().optional(),
    sourceGeo: base_js_1.GeoLocationSchema.optional(),
    destGeo: base_js_1.GeoLocationSchema.optional(),
    /** Application layer protocol if detected */
    appProtocol: zod_1.z.string().optional(),
    /** Session/connection ID for correlation */
    sessionId: zod_1.z.string().optional(),
});
/** DNS query types */
exports.DnsRecordType = zod_1.z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SOA', 'SRV']);
/** DNS event schema */
exports.DnsEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('network.dns'),
    queryName: zod_1.z.string(),
    queryType: exports.DnsRecordType,
    responseCode: zod_1.z.enum(['NOERROR', 'NXDOMAIN', 'SERVFAIL', 'REFUSED', 'TIMEOUT']),
    resolvedAddresses: zod_1.z.array(zod_1.z.string().ip()).optional(),
    clientAddress: base_js_1.NetworkAddressSchema,
    serverAddress: base_js_1.NetworkAddressSchema.optional(),
    queryTimeMs: zod_1.z.number().nonnegative(),
    /** Indicates potential DGA domain */
    dgaScore: zod_1.z.number().min(0).max(1).optional(),
    /** Domain age in days if known */
    domainAgeDays: zod_1.z.number().int().optional(),
    /** Is newly observed domain */
    isNewlyObserved: zod_1.z.boolean().optional(),
});
/** HTTP method */
exports.HttpMethod = zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
/** HTTP event schema */
exports.HttpEventSchema = base_js_1.BaseEventSchema.extend({
    eventType: zod_1.z.literal('network.http'),
    method: exports.HttpMethod,
    url: zod_1.z.string().url(),
    host: zod_1.z.string(),
    path: zod_1.z.string(),
    statusCode: zod_1.z.number().int().min(100).max(599),
    requestSize: zod_1.z.number().int().nonnegative(),
    responseSize: zod_1.z.number().int().nonnegative(),
    userAgent: zod_1.z.string().optional(),
    contentType: zod_1.z.string().optional(),
    referrer: zod_1.z.string().optional(),
    clientAddress: base_js_1.NetworkAddressSchema,
    serverAddress: base_js_1.NetworkAddressSchema,
    tlsVersion: zod_1.z.string().optional(),
    latencyMs: zod_1.z.number().nonnegative(),
    /** Request headers of interest */
    headers: zod_1.z.record(zod_1.z.string()).optional(),
});
/** Union type for all network events */
exports.NetworkEventSchema = zod_1.z.discriminatedUnion('eventType', [
    exports.NetworkFlowSchema,
    exports.DnsEventSchema,
    exports.HttpEventSchema,
]);
