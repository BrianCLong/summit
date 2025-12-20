/**
 * Network telemetry schemas
 *
 * Covers: flow logs, DNS, HTTP summaries, connection events
 */

import { z } from 'zod';
import { BaseEventSchema, NetworkAddressSchema, GeoLocationSchema } from './base.js';

/** Network flow direction */
export const FlowDirection = z.enum(['inbound', 'outbound', 'lateral']);

/** Transport protocol */
export const TransportProtocol = z.enum(['tcp', 'udp', 'icmp', 'sctp']);

/** Network flow log event */
export const NetworkFlowSchema = BaseEventSchema.extend({
  eventType: z.literal('network.flow'),
  source: NetworkAddressSchema,
  destination: NetworkAddressSchema,
  protocol: TransportProtocol,
  direction: FlowDirection,
  bytesIn: z.number().int().nonnegative(),
  bytesOut: z.number().int().nonnegative(),
  packetsIn: z.number().int().nonnegative(),
  packetsOut: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  action: z.enum(['allow', 'deny', 'drop']),
  ruleId: z.string().optional(),
  sourceGeo: GeoLocationSchema.optional(),
  destGeo: GeoLocationSchema.optional(),
  /** Application layer protocol if detected */
  appProtocol: z.string().optional(),
  /** Session/connection ID for correlation */
  sessionId: z.string().optional(),
});
export type NetworkFlow = z.infer<typeof NetworkFlowSchema>;

/** DNS query types */
export const DnsRecordType = z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SOA', 'SRV']);

/** DNS event schema */
export const DnsEventSchema = BaseEventSchema.extend({
  eventType: z.literal('network.dns'),
  queryName: z.string(),
  queryType: DnsRecordType,
  responseCode: z.enum(['NOERROR', 'NXDOMAIN', 'SERVFAIL', 'REFUSED', 'TIMEOUT']),
  resolvedAddresses: z.array(z.string().ip()).optional(),
  clientAddress: NetworkAddressSchema,
  serverAddress: NetworkAddressSchema.optional(),
  queryTimeMs: z.number().nonnegative(),
  /** Indicates potential DGA domain */
  dgaScore: z.number().min(0).max(1).optional(),
  /** Domain age in days if known */
  domainAgeDays: z.number().int().optional(),
  /** Is newly observed domain */
  isNewlyObserved: z.boolean().optional(),
});
export type DnsEvent = z.infer<typeof DnsEventSchema>;

/** HTTP method */
export const HttpMethod = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

/** HTTP event schema */
export const HttpEventSchema = BaseEventSchema.extend({
  eventType: z.literal('network.http'),
  method: HttpMethod,
  url: z.string().url(),
  host: z.string(),
  path: z.string(),
  statusCode: z.number().int().min(100).max(599),
  requestSize: z.number().int().nonnegative(),
  responseSize: z.number().int().nonnegative(),
  userAgent: z.string().optional(),
  contentType: z.string().optional(),
  referrer: z.string().optional(),
  clientAddress: NetworkAddressSchema,
  serverAddress: NetworkAddressSchema,
  tlsVersion: z.string().optional(),
  latencyMs: z.number().nonnegative(),
  /** Request headers of interest */
  headers: z.record(z.string()).optional(),
});
export type HttpEvent = z.infer<typeof HttpEventSchema>;

/** Union type for all network events */
export const NetworkEventSchema = z.discriminatedUnion('eventType', [
  NetworkFlowSchema,
  DnsEventSchema,
  HttpEventSchema,
]);
export type NetworkEvent = z.infer<typeof NetworkEventSchema>;
