/**
 * Packet Analyzer - Network packet analysis simulation
 * TRAINING/SIMULATION ONLY - No actual packet capture
 */

import { v4 as uuid } from 'uuid';

export interface PacketHeader {
  timestamp: Date;
  captureLength: number;
  originalLength: number;
  interface?: string;
}

export interface EthernetFrame {
  destinationMAC: string;
  sourceMAC: string;
  etherType: number;
  vlanTag?: number;
}

export interface IPPacket {
  version: 4 | 6;
  headerLength: number;
  dscp: number;
  totalLength: number;
  identification: number;
  flags: { dontFragment: boolean; moreFragments: boolean };
  fragmentOffset: number;
  ttl: number;
  protocol: number;
  checksum: number;
  sourceIP: string;
  destinationIP: string;
}

export interface TCPSegment {
  sourcePort: number;
  destinationPort: number;
  sequenceNumber: number;
  acknowledgmentNumber: number;
  dataOffset: number;
  flags: {
    fin: boolean;
    syn: boolean;
    rst: boolean;
    psh: boolean;
    ack: boolean;
    urg: boolean;
  };
  windowSize: number;
  checksum: number;
  urgentPointer: number;
  options?: Uint8Array;
}

export interface UDPDatagram {
  sourcePort: number;
  destinationPort: number;
  length: number;
  checksum: number;
}

export interface ParsedPacket {
  id: string;
  header: PacketHeader;
  ethernet?: EthernetFrame;
  ip?: IPPacket;
  tcp?: TCPSegment;
  udp?: UDPDatagram;
  applicationProtocol?: string;
  payload?: Uint8Array;
  payloadPreview?: string;
  isSimulated: boolean;
}

export interface PacketStatistics {
  totalPackets: number;
  totalBytes: number;
  protocolDistribution: Record<string, number>;
  topSources: Array<{ ip: string; count: number; bytes: number }>;
  topDestinations: Array<{ ip: string; count: number; bytes: number }>;
  topPorts: Array<{ port: number; protocol: string; count: number }>;
  packetsPerSecond: number;
  bytesPerSecond: number;
}

export class PacketAnalyzer {
  private packets: ParsedPacket[] = [];
  private maxPackets: number = 10000;
  private startTime?: Date;

  /**
   * Analyze a simulated packet
   */
  analyzePacket(rawData: Uint8Array): ParsedPacket {
    const packet: ParsedPacket = {
      id: uuid(),
      header: {
        timestamp: new Date(),
        captureLength: rawData.length,
        originalLength: rawData.length
      },
      isSimulated: true
    };

    // Parse Ethernet frame (first 14 bytes)
    if (rawData.length >= 14) {
      packet.ethernet = this.parseEthernet(rawData);

      // Parse IP packet
      if (packet.ethernet.etherType === 0x0800 && rawData.length >= 34) {
        packet.ip = this.parseIPv4(rawData.slice(14));

        // Parse transport layer
        const ipHeaderLength = packet.ip.headerLength * 4;
        const transportOffset = 14 + ipHeaderLength;

        if (packet.ip.protocol === 6 && rawData.length >= transportOffset + 20) {
          packet.tcp = this.parseTCP(rawData.slice(transportOffset));
          packet.applicationProtocol = this.identifyApplicationProtocol(
            packet.tcp.sourcePort,
            packet.tcp.destinationPort
          );

          // Extract payload
          const tcpHeaderLength = packet.tcp.dataOffset * 4;
          const payloadOffset = transportOffset + tcpHeaderLength;
          if (rawData.length > payloadOffset) {
            packet.payload = rawData.slice(payloadOffset);
            packet.payloadPreview = this.getPayloadPreview(packet.payload);
          }
        } else if (packet.ip.protocol === 17 && rawData.length >= transportOffset + 8) {
          packet.udp = this.parseUDP(rawData.slice(transportOffset));
          packet.applicationProtocol = this.identifyApplicationProtocol(
            packet.udp.sourcePort,
            packet.udp.destinationPort
          );

          // Extract payload
          const payloadOffset = transportOffset + 8;
          if (rawData.length > payloadOffset) {
            packet.payload = rawData.slice(payloadOffset);
            packet.payloadPreview = this.getPayloadPreview(packet.payload);
          }
        }
      }
    }

    // Store packet
    this.packets.push(packet);
    if (this.packets.length > this.maxPackets) {
      this.packets.shift();
    }

    if (!this.startTime) {
      this.startTime = packet.header.timestamp;
    }

    return packet;
  }

  /**
   * Generate simulated packets for training
   */
  generateSimulatedPackets(count: number): ParsedPacket[] {
    const packets: ParsedPacket[] = [];

    for (let i = 0; i < count; i++) {
      const packet = this.generateRandomPacket();
      packets.push(this.analyzePacket(packet));
    }

    return packets;
  }

  private generateRandomPacket(): Uint8Array {
    // Generate realistic-looking packet data
    const protocols = ['http', 'https', 'dns', 'smtp', 'ssh'];
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];

    const size = 64 + Math.floor(Math.random() * 1400);
    const data = new Uint8Array(size);

    // Ethernet header
    for (let i = 0; i < 6; i++) {
      data[i] = Math.floor(Math.random() * 256); // Dest MAC
      data[i + 6] = Math.floor(Math.random() * 256); // Src MAC
    }
    data[12] = 0x08; // EtherType IPv4
    data[13] = 0x00;

    // IP header
    data[14] = 0x45; // Version + IHL
    data[15] = 0x00; // DSCP
    data[16] = (size - 14) >> 8;
    data[17] = (size - 14) & 0xFF;
    data[22] = 64; // TTL

    // Protocol
    const isTcp = Math.random() > 0.3;
    data[23] = isTcp ? 6 : 17;

    // Source IP
    data[26] = 192;
    data[27] = 168;
    data[28] = Math.floor(Math.random() * 255);
    data[29] = Math.floor(Math.random() * 255);

    // Dest IP
    data[30] = Math.floor(Math.random() * 200) + 1;
    data[31] = Math.floor(Math.random() * 255);
    data[32] = Math.floor(Math.random() * 255);
    data[33] = Math.floor(Math.random() * 255);

    // Transport header
    const ports = this.getPortsForProtocol(protocol);
    if (isTcp) {
      data[34] = ports.src >> 8;
      data[35] = ports.src & 0xFF;
      data[36] = ports.dst >> 8;
      data[37] = ports.dst & 0xFF;
      data[46] = 0x50; // Data offset
      data[47] = 0x18; // Flags (PSH+ACK)
    } else {
      data[34] = ports.src >> 8;
      data[35] = ports.src & 0xFF;
      data[36] = ports.dst >> 8;
      data[37] = ports.dst & 0xFF;
    }

    // Simulated payload
    const payloadStart = isTcp ? 54 : 42;
    const payloadText = `[SIMULATED ${protocol.toUpperCase()} DATA]`;
    for (let i = 0; i < payloadText.length && payloadStart + i < size; i++) {
      data[payloadStart + i] = payloadText.charCodeAt(i);
    }

    return data;
  }

  private getPortsForProtocol(protocol: string): { src: number; dst: number } {
    const portMap: Record<string, number> = {
      http: 80,
      https: 443,
      dns: 53,
      smtp: 25,
      ssh: 22,
      ftp: 21
    };

    return {
      src: 1024 + Math.floor(Math.random() * 64000),
      dst: portMap[protocol] || 80
    };
  }

  private parseEthernet(data: Uint8Array): EthernetFrame {
    return {
      destinationMAC: Array.from(data.slice(0, 6))
        .map(b => b.toString(16).padStart(2, '0')).join(':'),
      sourceMAC: Array.from(data.slice(6, 12))
        .map(b => b.toString(16).padStart(2, '0')).join(':'),
      etherType: (data[12] << 8) | data[13]
    };
  }

  private parseIPv4(data: Uint8Array): IPPacket {
    return {
      version: 4,
      headerLength: data[0] & 0x0F,
      dscp: data[1] >> 2,
      totalLength: (data[2] << 8) | data[3],
      identification: (data[4] << 8) | data[5],
      flags: {
        dontFragment: (data[6] & 0x40) !== 0,
        moreFragments: (data[6] & 0x20) !== 0
      },
      fragmentOffset: ((data[6] & 0x1F) << 8) | data[7],
      ttl: data[8],
      protocol: data[9],
      checksum: (data[10] << 8) | data[11],
      sourceIP: `${data[12]}.${data[13]}.${data[14]}.${data[15]}`,
      destinationIP: `${data[16]}.${data[17]}.${data[18]}.${data[19]}`
    };
  }

  private parseTCP(data: Uint8Array): TCPSegment {
    return {
      sourcePort: (data[0] << 8) | data[1],
      destinationPort: (data[2] << 8) | data[3],
      sequenceNumber: (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7],
      acknowledgmentNumber: (data[8] << 24) | (data[9] << 16) | (data[10] << 8) | data[11],
      dataOffset: data[12] >> 4,
      flags: {
        fin: (data[13] & 0x01) !== 0,
        syn: (data[13] & 0x02) !== 0,
        rst: (data[13] & 0x04) !== 0,
        psh: (data[13] & 0x08) !== 0,
        ack: (data[13] & 0x10) !== 0,
        urg: (data[13] & 0x20) !== 0
      },
      windowSize: (data[14] << 8) | data[15],
      checksum: (data[16] << 8) | data[17],
      urgentPointer: (data[18] << 8) | data[19]
    };
  }

  private parseUDP(data: Uint8Array): UDPDatagram {
    return {
      sourcePort: (data[0] << 8) | data[1],
      destinationPort: (data[2] << 8) | data[3],
      length: (data[4] << 8) | data[5],
      checksum: (data[6] << 8) | data[7]
    };
  }

  private identifyApplicationProtocol(srcPort: number, dstPort: number): string {
    const wellKnownPorts: Record<number, string> = {
      20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'TELNET',
      25: 'SMTP', 53: 'DNS', 80: 'HTTP', 110: 'POP3',
      143: 'IMAP', 443: 'HTTPS', 993: 'IMAPS', 995: 'POP3S',
      3389: 'RDP', 5060: 'SIP', 5061: 'SIPS'
    };

    return wellKnownPorts[dstPort] || wellKnownPorts[srcPort] || 'UNKNOWN';
  }

  private getPayloadPreview(payload: Uint8Array): string {
    const maxLength = 100;
    const preview = Array.from(payload.slice(0, maxLength))
      .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
      .join('');
    return preview + (payload.length > maxLength ? '...' : '');
  }

  /**
   * Get packet statistics
   */
  getStatistics(): PacketStatistics {
    const stats: PacketStatistics = {
      totalPackets: this.packets.length,
      totalBytes: 0,
      protocolDistribution: {},
      topSources: [],
      topDestinations: [],
      topPorts: [],
      packetsPerSecond: 0,
      bytesPerSecond: 0
    };

    const sourceCounts = new Map<string, { count: number; bytes: number }>();
    const destCounts = new Map<string, { count: number; bytes: number }>();
    const portCounts = new Map<string, { port: number; protocol: string; count: number }>();

    for (const packet of this.packets) {
      stats.totalBytes += packet.header.originalLength;

      // Protocol distribution
      const proto = packet.applicationProtocol || 'UNKNOWN';
      stats.protocolDistribution[proto] = (stats.protocolDistribution[proto] || 0) + 1;

      // Source counts
      if (packet.ip) {
        const src = packet.ip.sourceIP;
        const srcData = sourceCounts.get(src) || { count: 0, bytes: 0 };
        srcData.count++;
        srcData.bytes += packet.header.originalLength;
        sourceCounts.set(src, srcData);

        const dst = packet.ip.destinationIP;
        const dstData = destCounts.get(dst) || { count: 0, bytes: 0 };
        dstData.count++;
        dstData.bytes += packet.header.originalLength;
        destCounts.set(dst, dstData);
      }

      // Port counts
      const port = packet.tcp?.destinationPort || packet.udp?.destinationPort;
      if (port) {
        const key = `${port}`;
        const portData = portCounts.get(key) || { port, protocol: proto, count: 0 };
        portData.count++;
        portCounts.set(key, portData);
      }
    }

    // Sort and get top entries
    stats.topSources = Array.from(sourceCounts.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.topDestinations = Array.from(destCounts.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    stats.topPorts = Array.from(portCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate rates
    if (this.startTime && this.packets.length > 0) {
      const duration = (Date.now() - this.startTime.getTime()) / 1000;
      if (duration > 0) {
        stats.packetsPerSecond = stats.totalPackets / duration;
        stats.bytesPerSecond = stats.totalBytes / duration;
      }
    }

    return stats;
  }

  getPackets(): ParsedPacket[] {
    return [...this.packets];
  }

  clear(): void {
    this.packets = [];
    this.startTime = undefined;
  }
}
