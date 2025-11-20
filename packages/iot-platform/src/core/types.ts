/**
 * Core IoT Platform Types
 * Defines fundamental types for IoT device connectivity and messaging
 */

export enum IoTProtocol {
  MQTT = 'mqtt',
  MQTTS = 'mqtts',
  COAP = 'coap',
  COAPS = 'coaps',
  AMQP = 'amqp',
  AMQPS = 'amqps',
  HTTP = 'http',
  HTTPS = 'https',
  WEBSOCKET = 'websocket',
  WSS = 'wss',
  LORAWAN = 'lorawan',
  ZIGBEE = 'zigbee',
  ZWAVE = 'zwave',
  BLE = 'ble',
  MODBUS = 'modbus',
  OPC_UA = 'opc-ua'
}

export enum QoSLevel {
  AT_MOST_ONCE = 0,   // Fire and forget
  AT_LEAST_ONCE = 1,  // Acknowledged delivery
  EXACTLY_ONCE = 2    // Assured delivery
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  SUSPENDED = 'suspended'
}

export interface IoTMessage {
  id: string;
  deviceId: string;
  timestamp: Date;
  protocol: IoTProtocol;
  topic?: string;
  payload: Buffer | object | string;
  qos: QoSLevel;
  retained?: boolean;
  metadata?: Record<string, any>;
}

export interface DeviceCredentials {
  deviceId: string;
  clientId: string;
  username?: string;
  password?: string;
  certificate?: string;
  privateKey?: string;
  caCertificate?: string;
  token?: string;
  apiKey?: string;
}

export interface ConnectionConfig {
  protocol: IoTProtocol;
  host: string;
  port: number;
  credentials: DeviceCredentials;
  secure: boolean;
  keepAlive?: number;
  reconnectPeriod?: number;
  connectTimeout?: number;
  clean?: boolean;
  will?: {
    topic: string;
    payload: Buffer | string;
    qos: QoSLevel;
    retain: boolean;
  };
}

export interface ProtocolAdapter {
  readonly protocol: IoTProtocol;
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: Buffer | string, qos?: QoSLevel): Promise<void>;
  subscribe(topic: string, qos?: QoSLevel): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  isConnected(): boolean;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler?: (...args: any[]) => void): void;
}

export interface DeviceState {
  deviceId: string;
  status: DeviceStatus;
  protocol: IoTProtocol;
  lastSeen: Date;
  lastMessage?: IoTMessage;
  connectionInfo?: {
    connectedAt: Date;
    remoteAddress?: string;
    protocol: IoTProtocol;
  };
  metadata: Record<string, any>;
}

export interface IoTGatewayConfig {
  protocols: IoTProtocol[];
  mqtt?: {
    port: number;
    secure: boolean;
    certPath?: string;
    keyPath?: string;
  };
  coap?: {
    port: number;
    secure: boolean;
  };
  amqp?: {
    port: number;
    secure: boolean;
  };
  websocket?: {
    port: number;
    path: string;
  };
  maxConnections?: number;
  messageBufferSize?: number;
  enableMetrics?: boolean;
}
