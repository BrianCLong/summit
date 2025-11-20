/**
 * Sensor Data Types
 */

export enum SensorType {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  PRESSURE = 'pressure',
  ACCELERATION = 'acceleration',
  GYROSCOPE = 'gyroscope',
  GPS = 'gps',
  CAMERA = 'camera',
  MICROPHONE = 'microphone',
  PROXIMITY = 'proximity',
  LIGHT = 'light',
  GAS = 'gas',
  CHEMICAL = 'chemical',
  BIOMETRIC = 'biometric',
  MOTION = 'motion',
  VIBRATION = 'vibration',
  FLOW = 'flow',
  LEVEL = 'level',
  VOLTAGE = 'voltage',
  CURRENT = 'current',
  POWER = 'power',
  CUSTOM = 'custom',
}

export enum DataUnit {
  CELSIUS = 'celsius',
  FAHRENHEIT = 'fahrenheit',
  KELVIN = 'kelvin',
  PERCENT = 'percent',
  PASCAL = 'pascal',
  BAR = 'bar',
  PSI = 'psi',
  METERS_PER_SECOND_SQUARED = 'm/s²',
  DEGREES_PER_SECOND = 'deg/s',
  LATITUDE = 'latitude',
  LONGITUDE = 'longitude',
  LUX = 'lux',
  PPM = 'ppm',
  MILLIVOLTS = 'mV',
  VOLTS = 'V',
  MILLIAMPS = 'mA',
  AMPS = 'A',
  WATTS = 'W',
  KILOWATTS = 'kW',
}

export interface SensorReading {
  id: string;
  deviceId: string;
  sensorId: string;
  sensorType: SensorType;
  timestamp: Date;
  value: number | string | boolean | object;
  unit?: DataUnit;
  quality?: number; // 0-1, confidence/quality of reading
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  deviceId: string;
  sensorId: string;
  fields: Record<string, number | string | boolean>;
  tags: Record<string, string>;
}

export interface SensorStream {
  deviceId: string;
  sensorId: string;
  sensorType: SensorType;
  samplingRate: number; // Hz
  resolution?: number;
  range?: {
    min: number;
    max: number;
  };
  active: boolean;
  lastReading?: Date;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export interface AccelerometerReading {
  x: number;
  y: number;
  z: number;
  magnitude?: number;
  timestamp: Date;
}

export interface EnvironmentalReading {
  temperature?: number;
  humidity?: number;
  pressure?: number;
  airQuality?: number;
  timestamp: Date;
}

export interface DataBuffer {
  deviceId: string;
  sensorId: string;
  readings: SensorReading[];
  capacity: number;
  flushThreshold: number;
  lastFlush: Date;
}

export interface DataIngestionConfig {
  batchSize?: number;
  batchTimeout?: number; // milliseconds
  maxRetries?: number;
  compression?: boolean;
  validation?: boolean;
}

export interface DataValidator {
  validate(reading: SensorReading): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface DataTransform {
  name: string;
  transform(reading: SensorReading): SensorReading | null;
}
