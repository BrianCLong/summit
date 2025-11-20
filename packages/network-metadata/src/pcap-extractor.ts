import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';
import { PacketMetadata, NetworkExtractionResult } from './types.js';

/**
 * Extractor for network packet captures (PCAP files)
 * Note: This is a simplified implementation. Production would use pcap-parser library
 */
export class PcapExtractor extends BaseExtractor {
  readonly name = 'pcap-extractor';
  readonly supportedTypes = [
    'application/vnd.tcpdump.pcap',
    'application/x-pcapng',
  ];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    if (mimeType && this.supportedTypes.includes(mimeType)) {
      return true;
    }

    // Check PCAP magic bytes
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const magic = buffer.readUInt32LE(0);

    return (
      magic === 0xa1b2c3d4 || // PCAP
      magic === 0xd4c3b2a1 || // PCAP (swapped)
      magic === 0x0a0d0d0a    // PCAPNG
    );
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<NetworkExtractionResult>> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Detect PCAP format
    const magic = buffer.readUInt32LE(0);
    const isPcapng = magic === 0x0a0d0d0a;

    // Extract basic metadata
    const packets = isPcapng ? this.parsePcapng(buffer) : this.parsePcap(buffer);

    // Analyze traffic patterns
    const anomalies = this.detectNetworkAnomalies(packets);

    // Extract temporal information
    const timestamps = packets.map(p => p.timestamp).filter(Boolean) as Date[];
    const created = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : undefined;
    const modified = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : undefined;

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'network-capture',
        confidence: 0.9,
      },
      temporal: {
        created,
        modified,
      },
      network: {
        packets: packets.slice(0, 1000), // Limit to first 1000 packets
      },
      anomalies: anomalies.length > 0 ? anomalies : undefined,
    };
  }

  private parsePcap(buffer: Buffer): PacketMetadata[] {
    const packets: PacketMetadata[] = [];
    let offset = 24; // Skip global header

    while (offset + 16 < buffer.length) {
      // Read packet header
      const tsSec = buffer.readUInt32LE(offset);
      const tsUsec = buffer.readUInt32LE(offset + 4);
      const inclLen = buffer.readUInt32LE(offset + 8);
      const origLen = buffer.readUInt32LE(offset + 12);

      offset += 16;

      if (offset + inclLen > buffer.length) break;

      // Extract basic packet info
      const packetData = buffer.slice(offset, offset + inclLen);
      const packetInfo = this.parsePacket(packetData);

      packets.push({
        protocol: packetInfo.protocol,
        sourceIp: packetInfo.sourceIp,
        sourcePort: packetInfo.sourcePort,
        destIp: packetInfo.destIp,
        destPort: packetInfo.destPort,
        packetSize: origLen,
        timestamp: new Date(tsSec * 1000 + tsUsec / 1000),
        ttl: packetInfo.ttl,
      });

      offset += inclLen;

      // Limit packet count for performance
      if (packets.length >= 10000) break;
    }

    return packets;
  }

  private parsePcapng(buffer: Buffer): PacketMetadata[] {
    // Simplified PCAPNG parsing
    return [];
  }

  private parsePacket(data: Buffer): Partial<PacketMetadata> {
    const info: Partial<PacketMetadata> = {
      protocol: 'unknown',
    };

    try {
      // Skip Ethernet header (14 bytes)
      if (data.length < 14) return info;

      const etherType = data.readUInt16BE(12);

      if (etherType === 0x0800) {
        // IPv4
        if (data.length < 34) return info;

        info.protocol = 'IPv4';
        info.ttl = data[22];
        info.sourceIp = `${data[26]}.${data[27]}.${data[28]}.${data[29]}`;
        info.destIp = `${data[30]}.${data[31]}.${data[32]}.${data[33]}`;

        const ipHeaderLen = (data[14] & 0x0f) * 4;
        const ipProto = data[23];

        if (ipProto === 6) {
          // TCP
          info.protocol = 'TCP';
          if (data.length >= 14 + ipHeaderLen + 4) {
            info.sourcePort = data.readUInt16BE(14 + ipHeaderLen);
            info.destPort = data.readUInt16BE(14 + ipHeaderLen + 2);
          }
        } else if (ipProto === 17) {
          // UDP
          info.protocol = 'UDP';
          if (data.length >= 14 + ipHeaderLen + 4) {
            info.sourcePort = data.readUInt16BE(14 + ipHeaderLen);
            info.destPort = data.readUInt16BE(14 + ipHeaderLen + 2);
          }
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }

    return info;
  }

  private detectNetworkAnomalies(packets: PacketMetadata[]): ExtractionResult['anomalies'] {
    const anomalies: ExtractionResult['anomalies'] = [];

    // Detect port scanning
    const uniquePorts = new Set(packets.map(p => p.destPort).filter(Boolean));
    if (uniquePorts.size > 100) {
      anomalies.push({
        type: 'port_scan_detected',
        severity: 'high',
        description: 'Potential port scanning activity detected',
        evidence: { uniquePorts: uniquePorts.size },
      });
    }

    // Detect high volume of packets to single destination
    const destIpCounts = new Map<string, number>();
    for (const packet of packets) {
      if (packet.destIp) {
        destIpCounts.set(packet.destIp, (destIpCounts.get(packet.destIp) || 0) + 1);
      }
    }

    for (const [ip, count] of destIpCounts) {
      if (count > packets.length * 0.5) {
        anomalies.push({
          type: 'traffic_concentration',
          severity: 'medium',
          description: 'High concentration of traffic to single destination',
          evidence: { destination: ip, packetCount: count },
        });
      }
    }

    return anomalies.length > 0 ? anomalies : undefined;
  }
}
