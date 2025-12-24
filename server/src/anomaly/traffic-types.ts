
export interface TrafficFlow {
  flowId: string;
  sourceIp: string;
  destIp: string;
  sourcePort: number;
  destPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER';
  bytes: number;
  packets: number;
  startTime: number;
  endTime: number;
  flags?: string[]; // e.g., ['SYN', 'ACK']
  payloadHints?: string[]; // e.g., 'GET / HTTP/1.1', 'User-Agent: bot'
}

export interface TrafficFeatures {
  flowId: string;
  duration: number;
  bytesPerPacket: number;
  packetsPerSecond: number;
  bytesPerSecond: number;
  tcpFlagCount: number;
  isEphemeralPort: boolean; // Source port > 1024
}

export interface TrafficAnomalyResult {
  isAnomaly: boolean;
  score: number; // 0-1
  type: 'DDOS' | 'BOTNET' | 'PROTOCOL' | 'UNKNOWN';
  confidence: number;
  details: string;
}
