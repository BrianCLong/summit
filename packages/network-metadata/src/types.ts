import { z } from 'zod';
import { ExtractionResult } from '@intelgraph/metadata-extractor';

/**
 * Network and protocol metadata schemas
 */

// Packet metadata schema
export const PacketMetadataSchema = z.object({
  protocol: z.string(),
  sourceIp: z.string().optional(),
  sourcePort: z.number().optional(),
  destIp: z.string().optional(),
  destPort: z.number().optional(),
  packetSize: z.number(),
  timestamp: z.date(),
  ttl: z.number().optional(),
  flags: z.array(z.string()).optional(),
  sequenceNumber: z.number().optional(),
  ackNumber: z.number().optional(),
});

export type PacketMetadata = z.infer<typeof PacketMetadataSchema>;

// HTTP metadata schema
export const HTTPMetadataSchema = z.object({
  method: z.string().optional(),
  url: z.string().optional(),
  protocol: z.string().optional(), // HTTP/1.1, HTTP/2, etc.
  statusCode: z.number().optional(),
  userAgent: z.string().optional(),
  referer: z.string().optional(),
  host: z.string().optional(),
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  cookies: z.record(z.string()).optional(),
  customHeaders: z.record(z.string()).optional(),
  requestTime: z.date().optional(),
  responseTime: z.date().optional(),
  duration: z.number().optional(), // milliseconds
});

export type HTTPMetadata = z.infer<typeof HTTPMetadataSchema>;

// TLS/SSL metadata schema
export const TLSMetadataSchema = z.object({
  version: z.string(),
  cipherSuite: z.string().optional(),
  serverName: z.string().optional(), // SNI
  certificates: z.array(z.object({
    subject: z.string(),
    issuer: z.string(),
    serialNumber: z.string(),
    validFrom: z.date(),
    validTo: z.date(),
    fingerprint: z.string(),
    signatureAlgorithm: z.string(),
    publicKeyAlgorithm: z.string(),
    keySize: z.number(),
    isExpired: z.boolean(),
    isSelfSigned: z.boolean(),
  })).optional(),
  handshakeTime: z.number().optional(), // milliseconds
  sessionId: z.string().optional(),
  sessionResumed: z.boolean().optional(),
});

export type TLSMetadata = z.infer<typeof TLSMetadataSchema>;

// DNS metadata schema
export const DNSMetadataSchema = z.object({
  queryType: z.string(), // A, AAAA, MX, TXT, etc.
  queryName: z.string(),
  responseCode: z.string().optional(), // NOERROR, NXDOMAIN, etc.
  answers: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string(),
    ttl: z.number(),
  })).optional(),
  authoritative: z.boolean().optional(),
  recursive: z.boolean().optional(),
  nameservers: z.array(z.string()).optional(),
  queryTime: z.number().optional(), // milliseconds
  serverId: z.string().optional(),
});

export type DNSMetadata = z.infer<typeof DNSMetadataSchema>;

// Network flow metadata
export const NetworkFlowMetadataSchema = z.object({
  sourceIp: z.string(),
  sourcePort: z.number().optional(),
  destIp: z.string(),
  destPort: z.number().optional(),
  protocol: z.string(),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // milliseconds
  bytesTransferred: z.number(),
  packetsTransferred: z.number(),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']),
  flags: z.array(z.string()).optional(),

  // Traffic characteristics
  averagePacketSize: z.number().optional(),
  peakBandwidth: z.number().optional(), // bytes per second
  averageBandwidth: z.number().optional(),

  // Geo information
  sourceCountry: z.string().optional(),
  destCountry: z.string().optional(),
  sourceOrg: z.string().optional(),
  destOrg: z.string().optional(),
});

export type NetworkFlowMetadata = z.infer<typeof NetworkFlowMetadataSchema>;

// Network extraction result
export type NetworkExtractionResult = ExtractionResult & {
  network?: {
    packets?: PacketMetadata[];
    http?: HTTPMetadata;
    tls?: TLSMetadata;
    dns?: DNSMetadata;
    flow?: NetworkFlowMetadata;
  };
};
