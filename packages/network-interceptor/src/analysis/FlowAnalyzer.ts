/**
 * Flow Analyzer - Network flow analysis
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface NetworkFlow {
  id: string;
  sourceIP: string;
  sourcePort: number;
  destinationIP: string;
  destinationPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER';

  // Metrics
  startTime: Date;
  endTime?: Date;
  duration: number; // milliseconds
  packetCount: number;
  byteCount: number;
  packets: {
    forward: number;
    reverse: number;
  };
  bytes: {
    forward: number;
    reverse: number;
  };

  // Flags (TCP)
  flags?: {
    syn: number;
    ack: number;
    fin: number;
    rst: number;
    psh: number;
  };

  // Analysis
  applicationProtocol?: string;
  classification?: FlowClassification;
  anomalyScore: number;

  isSimulated: boolean;
}

export interface FlowClassification {
  category: 'normal' | 'suspicious' | 'malicious' | 'unknown';
  subcategory?: string;
  confidence: number;
  indicators: string[];
}

export interface FlowStatistics {
  totalFlows: number;
  activeFlows: number;
  completedFlows: number;
  totalBytes: number;
  totalPackets: number;
  topProtocols: Array<{ protocol: string; count: number; bytes: number }>;
  topTalkers: Array<{ ip: string; flows: number; bytes: number }>;
  suspiciousFlows: number;
}

export class FlowAnalyzer {
  private flows: Map<string, NetworkFlow> = new Map();
  private completedFlows: NetworkFlow[] = [];
  private maxCompletedFlows: number = 10000;

  /**
   * Create or update a flow from packet data
   */
  processPacket(packet: {
    timestamp: Date;
    sourceIP: string;
    sourcePort: number;
    destinationIP: string;
    destinationPort: number;
    protocol: number;
    bytes: number;
    tcpFlags?: number;
  }): NetworkFlow {
    const flowKey = this.generateFlowKey(packet);
    let flow = this.flows.get(flowKey);

    const isForward = this.isForwardDirection(packet, flowKey);

    if (!flow) {
      flow = this.createFlow(packet);
      this.flows.set(flowKey, flow);
    }

    // Update flow metrics
    flow.packetCount++;
    flow.byteCount += packet.bytes;
    flow.duration = packet.timestamp.getTime() - flow.startTime.getTime();

    if (isForward) {
      flow.packets.forward++;
      flow.bytes.forward += packet.bytes;
    } else {
      flow.packets.reverse++;
      flow.bytes.reverse += packet.bytes;
    }

    // Update TCP flags
    if (flow.protocol === 'TCP' && packet.tcpFlags !== undefined) {
      if (!flow.flags) {
        flow.flags = { syn: 0, ack: 0, fin: 0, rst: 0, psh: 0 };
      }
      if (packet.tcpFlags & 0x02) flow.flags.syn++;
      if (packet.tcpFlags & 0x10) flow.flags.ack++;
      if (packet.tcpFlags & 0x01) flow.flags.fin++;
      if (packet.tcpFlags & 0x04) flow.flags.rst++;
      if (packet.tcpFlags & 0x08) flow.flags.psh++;
    }

    // Classify flow periodically
    if (flow.packetCount % 10 === 0) {
      flow.classification = this.classifyFlow(flow);
      flow.anomalyScore = this.calculateAnomalyScore(flow);
    }

    return flow;
  }

  /**
   * Generate simulated flows for training
   */
  generateSimulatedFlows(count: number): NetworkFlow[] {
    const flows: NetworkFlow[] = [];

    for (let i = 0; i < count; i++) {
      const flow = this.createSimulatedFlow();
      flows.push(flow);
      this.completedFlows.push(flow);
    }

    // Trim if needed
    if (this.completedFlows.length > this.maxCompletedFlows) {
      this.completedFlows = this.completedFlows.slice(-this.maxCompletedFlows);
    }

    return flows;
  }

  private createSimulatedFlow(): NetworkFlow {
    const protocols = ['TCP', 'UDP'] as const;
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];

    const appProtocols = ['HTTP', 'HTTPS', 'DNS', 'SSH', 'SMTP', 'UNKNOWN'];
    const appProtocol = appProtocols[Math.floor(Math.random() * appProtocols.length)];

    const duration = Math.floor(Math.random() * 300000); // up to 5 minutes
    const packetCount = 10 + Math.floor(Math.random() * 1000);
    const byteCount = packetCount * (64 + Math.floor(Math.random() * 1400));

    const forwardRatio = 0.3 + Math.random() * 0.4;

    const flow: NetworkFlow = {
      id: uuid(),
      sourceIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      sourcePort: 1024 + Math.floor(Math.random() * 64000),
      destinationIP: `${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      destinationPort: this.getRandomPort(appProtocol),
      protocol,
      startTime: new Date(Date.now() - duration),
      endTime: new Date(),
      duration,
      packetCount,
      byteCount,
      packets: {
        forward: Math.floor(packetCount * forwardRatio),
        reverse: Math.floor(packetCount * (1 - forwardRatio))
      },
      bytes: {
        forward: Math.floor(byteCount * forwardRatio),
        reverse: Math.floor(byteCount * (1 - forwardRatio))
      },
      applicationProtocol: appProtocol,
      anomalyScore: Math.random() * 0.3, // Mostly normal
      isSimulated: true
    };

    if (protocol === 'TCP') {
      flow.flags = {
        syn: 1,
        ack: Math.floor(packetCount * 0.9),
        fin: 1,
        rst: 0,
        psh: Math.floor(packetCount * 0.3)
      };
    }

    flow.classification = this.classifyFlow(flow);

    return flow;
  }

  private getRandomPort(appProtocol: string): number {
    const ports: Record<string, number> = {
      HTTP: 80,
      HTTPS: 443,
      DNS: 53,
      SSH: 22,
      SMTP: 25
    };
    return ports[appProtocol] || (1024 + Math.floor(Math.random() * 64000));
  }

  private createFlow(packet: {
    timestamp: Date;
    sourceIP: string;
    sourcePort: number;
    destinationIP: string;
    destinationPort: number;
    protocol: number;
    bytes: number;
  }): NetworkFlow {
    let protocol: NetworkFlow['protocol'] = 'OTHER';
    if (packet.protocol === 6) protocol = 'TCP';
    else if (packet.protocol === 17) protocol = 'UDP';
    else if (packet.protocol === 1) protocol = 'ICMP';

    return {
      id: uuid(),
      sourceIP: packet.sourceIP,
      sourcePort: packet.sourcePort,
      destinationIP: packet.destinationIP,
      destinationPort: packet.destinationPort,
      protocol,
      startTime: packet.timestamp,
      duration: 0,
      packetCount: 0,
      byteCount: 0,
      packets: { forward: 0, reverse: 0 },
      bytes: { forward: 0, reverse: 0 },
      anomalyScore: 0,
      isSimulated: true
    };
  }

  private generateFlowKey(packet: {
    sourceIP: string;
    sourcePort: number;
    destinationIP: string;
    destinationPort: number;
    protocol: number;
  }): string {
    // Bidirectional flow key
    const ips = [packet.sourceIP, packet.destinationIP].sort();
    const ports = [packet.sourcePort, packet.destinationPort].sort();
    return `${ips[0]}:${ports[0]}-${ips[1]}:${ports[1]}-${packet.protocol}`;
  }

  private isForwardDirection(
    packet: { sourceIP: string; sourcePort: number },
    flowKey: string
  ): boolean {
    return flowKey.startsWith(`${packet.sourceIP}:${packet.sourcePort}`);
  }

  /**
   * Classify flow behavior
   */
  private classifyFlow(flow: NetworkFlow): FlowClassification {
    const indicators: string[] = [];
    let category: FlowClassification['category'] = 'normal';
    let confidence = 0.8;

    // Check for suspicious patterns
    if (flow.packetCount > 0 && flow.byteCount / flow.packetCount < 60) {
      indicators.push('Small packets - possible scan');
    }

    if (flow.packets.reverse === 0 && flow.packets.forward > 100) {
      indicators.push('One-way traffic - possible exfiltration');
    }

    if (flow.flags?.syn && flow.flags.syn > 5 && flow.flags.ack === 0) {
      indicators.push('SYN flood pattern');
      category = 'suspicious';
    }

    if (flow.flags?.rst && flow.flags.rst > flow.packetCount * 0.5) {
      indicators.push('High RST ratio - possible scan');
      category = 'suspicious';
    }

    // Check for known malicious ports
    const maliciousPorts = [4444, 5555, 6666, 31337];
    if (maliciousPorts.includes(flow.destinationPort)) {
      indicators.push('Known malicious port');
      category = 'suspicious';
    }

    if (indicators.length === 0) {
      indicators.push('No anomalies detected');
    }

    return {
      category,
      confidence,
      indicators
    };
  }

  /**
   * Calculate anomaly score (0-1)
   */
  private calculateAnomalyScore(flow: NetworkFlow): number {
    let score = 0;

    // Packet size anomaly
    const avgPacketSize = flow.byteCount / Math.max(1, flow.packetCount);
    if (avgPacketSize < 60 || avgPacketSize > 1400) {
      score += 0.2;
    }

    // Duration anomaly
    if (flow.duration > 0 && flow.packetCount / (flow.duration / 1000) > 1000) {
      score += 0.3; // Very high packet rate
    }

    // Asymmetry
    const totalPackets = flow.packets.forward + flow.packets.reverse;
    if (totalPackets > 10) {
      const ratio = Math.min(flow.packets.forward, flow.packets.reverse) /
        Math.max(flow.packets.forward, flow.packets.reverse);
      if (ratio < 0.1) {
        score += 0.2;
      }
    }

    // TCP flag anomalies
    if (flow.flags) {
      if (flow.flags.rst > flow.packetCount * 0.3) score += 0.2;
      if (flow.flags.syn > 10 && flow.flags.ack < flow.flags.syn) score += 0.3;
    }

    return Math.min(1, score);
  }

  /**
   * Expire old flows
   */
  expireFlows(maxAgeMs: number): void {
    const now = Date.now();

    for (const [key, flow] of this.flows) {
      const age = now - flow.startTime.getTime() - flow.duration;
      if (age > maxAgeMs) {
        flow.endTime = new Date(flow.startTime.getTime() + flow.duration);
        this.completedFlows.push(flow);
        this.flows.delete(key);
      }
    }

    // Trim completed flows
    if (this.completedFlows.length > this.maxCompletedFlows) {
      this.completedFlows = this.completedFlows.slice(-this.maxCompletedFlows);
    }
  }

  /**
   * Get flow statistics
   */
  getStatistics(): FlowStatistics {
    const allFlows = [...this.flows.values(), ...this.completedFlows];

    const protocolCounts = new Map<string, { count: number; bytes: number }>();
    const talkerCounts = new Map<string, { flows: number; bytes: number }>();
    let suspiciousCount = 0;

    let totalBytes = 0;
    let totalPackets = 0;

    for (const flow of allFlows) {
      totalBytes += flow.byteCount;
      totalPackets += flow.packetCount;

      // Protocol stats
      const proto = flow.applicationProtocol || flow.protocol;
      const protoData = protocolCounts.get(proto) || { count: 0, bytes: 0 };
      protoData.count++;
      protoData.bytes += flow.byteCount;
      protocolCounts.set(proto, protoData);

      // Talker stats
      for (const ip of [flow.sourceIP, flow.destinationIP]) {
        const talkerData = talkerCounts.get(ip) || { flows: 0, bytes: 0 };
        talkerData.flows++;
        talkerData.bytes += flow.byteCount / 2;
        talkerCounts.set(ip, talkerData);
      }

      if (flow.classification?.category === 'suspicious' ||
        flow.classification?.category === 'malicious') {
        suspiciousCount++;
      }
    }

    return {
      totalFlows: allFlows.length,
      activeFlows: this.flows.size,
      completedFlows: this.completedFlows.length,
      totalBytes,
      totalPackets,
      topProtocols: Array.from(protocolCounts.entries())
        .map(([protocol, data]) => ({ protocol, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topTalkers: Array.from(talkerCounts.entries())
        .map(([ip, data]) => ({ ip, ...data }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 10),
      suspiciousFlows: suspiciousCount
    };
  }

  getActiveFlows(): NetworkFlow[] {
    return Array.from(this.flows.values());
  }

  getCompletedFlows(): NetworkFlow[] {
    return [...this.completedFlows];
  }

  getSuspiciousFlows(): NetworkFlow[] {
    return [...this.flows.values(), ...this.completedFlows]
      .filter(f => f.classification?.category === 'suspicious' ||
        f.classification?.category === 'malicious');
  }

  clear(): void {
    this.flows.clear();
    this.completedFlows = [];
  }
}
