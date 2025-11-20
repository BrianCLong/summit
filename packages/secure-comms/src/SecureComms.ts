import { v4 as uuidv4 } from 'uuid';
import {
  SecureMessage,
  SecureMessageSchema,
  DeadDrop,
  DeadDropSchema,
  CommunicationDevice,
  CommunicationDeviceSchema,
  CovertChannel,
  CovertChannelSchema,
  AuthenticationProtocol,
  AuthenticationProtocolSchema,
  CommunicationLog,
  CommunicationLogSchema,
  EmergencyProtocol,
  EmergencyProtocolSchema,
  SignalProtocol,
  SignalProtocolSchema,
  MessageStatus,
  EncryptionType
} from './types.js';

/**
 * Secure Communication System for HUMINT Operations
 * Provides encrypted messaging, dead drops, and covert communication channels
 */
export class SecureComms {
  private messages: Map<string, SecureMessage> = new Map();
  private deadDrops: Map<string, DeadDrop> = new Map();
  private devices: Map<string, CommunicationDevice> = new Map();
  private covertChannels: Map<string, CovertChannel> = new Map();
  private authProtocols: Map<string, AuthenticationProtocol> = new Map();
  private commLogs: Map<string, CommunicationLog[]> = new Map();
  private emergencyProtocols: Map<string, EmergencyProtocol> = new Map();
  private signalProtocols: Map<string, SignalProtocol> = new Map();

  /**
   * Send a secure message
   */
  sendSecureMessage(data: Omit<SecureMessage, 'id' | 'created' | 'status' | 'sentAt'>): SecureMessage {
    // Simulate encryption
    const encryptedContent = this.encrypt(data.content, data.encryptionType);

    const message: SecureMessage = {
      ...data,
      id: uuidv4(),
      encryptedContent,
      status: MessageStatus.SENT,
      sentAt: new Date(),
      created: new Date()
    };

    const validated = SecureMessageSchema.parse(message);
    this.messages.set(validated.id, validated);

    // Log communication
    this.logCommunication({
      type: 'MESSAGE',
      participants: [data.senderId, data.recipientId],
      timestamp: new Date(),
      method: data.method,
      authenticated: !!data.authenticationCode,
      duressDetected: data.isDuress || false
    });

    return validated;
  }

  /**
   * Simulate encryption
   */
  private encrypt(content: string, type: EncryptionType): string {
    // In production, this would use actual encryption libraries
    return `ENCRYPTED[${type}]:${Buffer.from(content).toString('base64')}`;
  }

  /**
   * Simulate decryption
   */
  private decrypt(encryptedContent: string): string {
    // In production, this would use actual decryption libraries
    const match = encryptedContent.match(/ENCRYPTED\[.*?\]:(.*)/);
    if (match) {
      return Buffer.from(match[1], 'base64').toString('utf-8');
    }
    return encryptedContent;
  }

  /**
   * Mark message as delivered
   */
  markMessageDelivered(messageId: string): SecureMessage {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const updated = {
      ...message,
      status: MessageStatus.DELIVERED,
      deliveredAt: new Date()
    };

    const validated = SecureMessageSchema.parse(updated);
    this.messages.set(messageId, validated);

    return validated;
  }

  /**
   * Mark message as read
   */
  markMessageRead(messageId: string): SecureMessage {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const updated = {
      ...message,
      status: MessageStatus.READ,
      readAt: new Date()
    };

    const validated = SecureMessageSchema.parse(updated);
    this.messages.set(messageId, validated);

    return validated;
  }

  /**
   * Get messages for a user
   */
  getUserMessages(userId: string, unreadOnly: boolean = false): SecureMessage[] {
    const messages = Array.from(this.messages.values()).filter(
      m => m.recipientId === userId || m.senderId === userId
    );

    if (unreadOnly) {
      return messages.filter(m => m.recipientId === userId && m.status !== MessageStatus.READ);
    }

    return messages.sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Schedule a dead drop
   */
  scheduleDeadDrop(data: Omit<DeadDrop, 'id' | 'status'>): DeadDrop {
    const deadDrop: DeadDrop = {
      ...data,
      id: uuidv4(),
      status: 'SCHEDULED'
    };

    const validated = DeadDropSchema.parse(deadDrop);
    this.deadDrops.set(validated.id, validated);

    return validated;
  }

  /**
   * Mark dead drop as deposited
   */
  depositDeadDrop(deadDropId: string, depositedBy: string): DeadDrop {
    const deadDrop = this.deadDrops.get(deadDropId);
    if (!deadDrop) {
      throw new Error(`Dead drop not found: ${deadDropId}`);
    }

    const updated = {
      ...deadDrop,
      status: 'DEPOSITED' as const,
      depositedBy,
      depositedAt: new Date()
    };

    const validated = DeadDropSchema.parse(updated);
    this.deadDrops.set(deadDropId, validated);

    // Log communication
    this.logCommunication({
      type: 'DEAD_DROP',
      participants: [depositedBy],
      timestamp: new Date(),
      method: 'DEAD_DROP',
      authenticated: true,
      duressDetected: false,
      summary: `Dead drop deposited at ${deadDrop.locationDescription}`
    });

    return validated;
  }

  /**
   * Mark dead drop as retrieved
   */
  retrieveDeadDrop(deadDropId: string, retrievedBy: string): DeadDrop {
    const deadDrop = this.deadDrops.get(deadDropId);
    if (!deadDrop) {
      throw new Error(`Dead drop not found: ${deadDropId}`);
    }

    if (deadDrop.status !== 'DEPOSITED') {
      throw new Error(`Dead drop not ready for retrieval: ${deadDrop.status}`);
    }

    const updated = {
      ...deadDrop,
      status: 'RETRIEVED' as const,
      retrievedBy,
      retrievedAt: new Date()
    };

    const validated = DeadDropSchema.parse(updated);
    this.deadDrops.set(deadDropId, validated);

    // Log communication
    this.logCommunication({
      type: 'DEAD_DROP',
      participants: [retrievedBy],
      timestamp: new Date(),
      method: 'DEAD_DROP',
      authenticated: true,
      duressDetected: false,
      summary: `Dead drop retrieved from ${deadDrop.locationDescription}`
    });

    return validated;
  }

  /**
   * Get dead drops
   */
  getDeadDrops(status?: string): DeadDrop[] {
    const drops = Array.from(this.deadDrops.values());
    if (status) {
      return drops.filter(d => d.status === status);
    }
    return drops;
  }

  /**
   * Register a communication device
   */
  registerDevice(data: Omit<CommunicationDevice, 'id'>): CommunicationDevice {
    const device: CommunicationDevice = {
      ...data,
      id: uuidv4()
    };

    const validated = CommunicationDeviceSchema.parse(device);
    this.devices.set(validated.id, validated);

    return validated;
  }

  /**
   * Assign device to user
   */
  assignDevice(deviceId: string, userId: string): CommunicationDevice {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    if (device.status !== 'AVAILABLE') {
      throw new Error(`Device not available: ${device.status}`);
    }

    const updated = {
      ...device,
      assignedTo: userId,
      assignedDate: new Date(),
      status: 'ASSIGNED' as const
    };

    const validated = CommunicationDeviceSchema.parse(updated);
    this.devices.set(deviceId, validated);

    return validated;
  }

  /**
   * Get devices assigned to a user
   */
  getUserDevices(userId: string): CommunicationDevice[] {
    return Array.from(this.devices.values()).filter(d => d.assignedTo === userId);
  }

  /**
   * Create covert channel
   */
  createCovertChannel(data: Omit<CovertChannel, 'id'>): CovertChannel {
    const channel: CovertChannel = {
      ...data,
      id: uuidv4()
    };

    const validated = CovertChannelSchema.parse(channel);
    this.covertChannels.set(validated.id, validated);

    return validated;
  }

  /**
   * Get active covert channels
   */
  getActiveCovertChannels(): CovertChannel[] {
    return Array.from(this.covertChannels.values()).filter(c => c.status === 'ACTIVE');
  }

  /**
   * Create authentication protocol
   */
  createAuthenticationProtocol(data: Omit<AuthenticationProtocol, 'id'>): AuthenticationProtocol {
    const protocol: AuthenticationProtocol = {
      ...data,
      id: uuidv4()
    };

    const validated = AuthenticationProtocolSchema.parse(protocol);
    this.authProtocols.set(`${data.sourceId}-${data.handlerId}`, validated);

    return validated;
  }

  /**
   * Get authentication protocol for source-handler pair
   */
  getAuthenticationProtocol(sourceId: string, handlerId: string): AuthenticationProtocol | undefined {
    return this.authProtocols.get(`${sourceId}-${handlerId}`);
  }

  /**
   * Verify authentication code
   */
  verifyAuthenticationCode(sourceId: string, handlerId: string, code: string): {
    valid: boolean;
    isDuress: boolean;
  } {
    const protocol = this.getAuthenticationProtocol(sourceId, handlerId);
    if (!protocol) {
      return { valid: false, isDuress: false };
    }

    // Check if code matches duress code
    if (code === protocol.duressCode) {
      return { valid: true, isDuress: true };
    }

    // Check if code matches primary or backup
    const valid = code === protocol.primaryCode || code === protocol.backupCode;
    return { valid, isDuress: false };
  }

  /**
   * Log communication
   */
  private logCommunication(data: Omit<CommunicationLog, 'id'>): CommunicationLog {
    const log: CommunicationLog = {
      ...data,
      id: uuidv4()
    };

    const validated = CommunicationLogSchema.parse(log);

    // Store logs per participant
    data.participants.forEach(participantId => {
      const logs = this.commLogs.get(participantId) || [];
      logs.push(validated);
      this.commLogs.set(participantId, logs);
    });

    return validated;
  }

  /**
   * Get communication logs for a user
   */
  getCommunicationLogs(userId: string, startDate?: Date, endDate?: Date): CommunicationLog[] {
    const logs = this.commLogs.get(userId) || [];

    return logs.filter(log => {
      if (startDate && log.timestamp < startDate) return false;
      if (endDate && log.timestamp > endDate) return false;
      return true;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Create emergency protocol
   */
  createEmergencyProtocol(data: Omit<EmergencyProtocol, 'id'>): EmergencyProtocol {
    const protocol: EmergencyProtocol = {
      ...data,
      id: uuidv4()
    };

    const validated = EmergencyProtocolSchema.parse(protocol);
    this.emergencyProtocols.set(data.sourceId, validated);

    return validated;
  }

  /**
   * Activate emergency protocol
   */
  activateEmergencyProtocol(sourceId: string): EmergencyProtocol {
    const protocol = this.emergencyProtocols.get(sourceId);
    if (!protocol) {
      throw new Error(`Emergency protocol not found for source: ${sourceId}`);
    }

    const updated = {
      ...protocol,
      status: 'ACTIVATED' as const,
      activationDate: new Date()
    };

    const validated = EmergencyProtocolSchema.parse(updated);
    this.emergencyProtocols.set(sourceId, validated);

    // Log emergency activation
    this.logCommunication({
      type: 'SIGNAL',
      participants: [sourceId],
      timestamp: new Date(),
      method: 'ANONYMOUS_CHANNEL',
      authenticated: true,
      duressDetected: true,
      summary: 'EMERGENCY PROTOCOL ACTIVATED'
    });

    return validated;
  }

  /**
   * Create signal protocol
   */
  createSignalProtocol(data: Omit<SignalProtocol, 'id'>): SignalProtocol {
    const protocol: SignalProtocol = {
      ...data,
      id: uuidv4()
    };

    const validated = SignalProtocolSchema.parse(protocol);
    this.signalProtocols.set(validated.id, validated);

    return validated;
  }

  /**
   * Get signal protocols for source-handler pair
   */
  getSignalProtocols(sourceId: string, handlerId: string): SignalProtocol[] {
    return Array.from(this.signalProtocols.values()).filter(
      p => p.sourceId === sourceId && p.handlerId === handlerId
    );
  }

  /**
   * Detect communication pattern anomalies
   */
  detectAnomalies(userId: string, timeWindowHours: number = 24): {
    anomaliesDetected: boolean;
    anomalies: string[];
  } {
    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const logs = this.getCommunicationLogs(userId, since);

    const anomalies: string[] = [];

    // Check for unusual frequency
    if (logs.length > timeWindowHours * 5) {
      anomalies.push(`Unusually high communication frequency: ${logs.length} events in ${timeWindowHours} hours`);
    }

    // Check for duress signals
    const duressEvents = logs.filter(l => l.duressDetected);
    if (duressEvents.length > 0) {
      anomalies.push(`Duress signals detected: ${duressEvents.length} events`);
    }

    // Check for failed authentications
    const authFailures = logs.filter(l => !l.authenticated);
    if (authFailures.length > 3) {
      anomalies.push(`Multiple authentication failures: ${authFailures.length} events`);
    }

    // Check for security incidents
    const incidents = logs.filter(l => l.securityIncidents && l.securityIncidents.length > 0);
    if (incidents.length > 0) {
      anomalies.push(`Security incidents reported: ${incidents.length} events`);
    }

    return {
      anomaliesDetected: anomalies.length > 0,
      anomalies
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const messages = Array.from(this.messages.values());
    const allLogs = Array.from(this.commLogs.values()).flat();

    return {
      totalMessages: messages.length,
      pendingMessages: messages.filter(m => m.status === MessageStatus.SENT).length,
      unreadMessages: messages.filter(m => m.status === MessageStatus.DELIVERED).length,
      activeDeadDrops: Array.from(this.deadDrops.values()).filter(d => d.status === 'DEPOSITED').length,
      assignedDevices: Array.from(this.devices.values()).filter(d => d.status === 'ASSIGNED').length,
      activeCovertChannels: this.getActiveCovertChannels().length,
      totalCommunications: allLogs.length,
      duressSignalsDetected: allLogs.filter(l => l.duressDetected).length,
      securityIncidents: allLogs.filter(l => l.securityIncidents && l.securityIncidents.length > 0).length
    };
  }
}
