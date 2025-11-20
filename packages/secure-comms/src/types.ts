import { z } from 'zod';

/**
 * Communication Method
 */
export enum CommunicationMethod {
  ENCRYPTED_MESSAGE = 'ENCRYPTED_MESSAGE',
  SECURE_VOICE = 'SECURE_VOICE',
  SECURE_VIDEO = 'SECURE_VIDEO',
  DEAD_DROP = 'DEAD_DROP',
  ANONYMOUS_CHANNEL = 'ANONYMOUS_CHANNEL',
  COVERT_CHANNEL = 'COVERT_CHANNEL'
}

/**
 * Message Status
 */
export enum MessageStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  DELETED = 'DELETED'
}

/**
 * Encryption Type
 */
export enum EncryptionType {
  AES_256 = 'AES_256',
  RSA_4096 = 'RSA_4096',
  END_TO_END = 'END_TO_END',
  QUANTUM_RESISTANT = 'QUANTUM_RESISTANT'
}

/**
 * Authentication Method
 */
export enum AuthenticationMethod {
  CODE_WORD = 'CODE_WORD',
  BIOMETRIC = 'BIOMETRIC',
  TWO_FACTOR = 'TWO_FACTOR',
  CERTIFICATE = 'CERTIFICATE',
  CHALLENGE_RESPONSE = 'CHALLENGE_RESPONSE'
}

/**
 * Device Type
 */
export enum DeviceType {
  SECURE_PHONE = 'SECURE_PHONE',
  ENCRYPTED_TABLET = 'ENCRYPTED_TABLET',
  SECURE_LAPTOP = 'SECURE_LAPTOP',
  BURNER_PHONE = 'BURNER_PHONE',
  DEDICATED_DEVICE = 'DEDICATED_DEVICE'
}

// Schemas
export const SecureMessageSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  subject: z.string().optional(),
  content: z.string(),
  encryptedContent: z.string(),
  encryptionType: z.nativeEnum(EncryptionType),
  method: z.nativeEnum(CommunicationMethod),
  status: z.nativeEnum(MessageStatus),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  readAt: z.date().optional(),
  expiresAt: z.date().optional(),
  authenticationCode: z.string().optional(),
  isDuress: z.boolean().default(false),
  attachments: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    encryptedUrl: z.string(),
    size: z.number()
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
  created: z.date()
});

export const DeadDropSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string(),
  locationDescription: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lon: z.number()
  }).optional(),
  scheduledTime: z.date(),
  depositedBy: z.string().uuid().optional(),
  retrievedBy: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'DEPOSITED', 'RETRIEVED', 'COMPROMISED', 'CANCELLED']),
  packageDescription: z.string(),
  authenticationMarker: z.string(),
  retrievalInstructions: z.string(),
  alternativeLocation: z.string().optional(),
  surveillanceDetectionRequired: z.boolean(),
  depositedAt: z.date().optional(),
  retrievedAt: z.date().optional(),
  notes: z.string().optional()
});

export const CommunicationDeviceSchema = z.object({
  id: z.string().uuid(),
  deviceType: z.nativeEnum(DeviceType),
  serialNumber: z.string(),
  assignedTo: z.string().uuid().optional(),
  assignedDate: z.date().optional(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'IN_USE', 'COMPROMISED', 'RETIRED']),
  encryptionEnabled: z.boolean(),
  lastSecurityCheck: z.date(),
  expiryDate: z.date().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const CovertChannelSchema = z.object({
  id: z.string().uuid(),
  channelType: z.enum(['STEGANOGRAPHY', 'CODED_MESSAGE', 'TIMING_CHANNEL', 'SOCIAL_MEDIA', 'PUBLIC_FORUM']),
  platform: z.string(),
  identifiers: z.record(z.string()),
  codebook: z.string().optional(),
  activeFrom: z.date(),
  activeTo: z.date().optional(),
  lastUsed: z.date().optional(),
  compromiseIndicators: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'DORMANT', 'COMPROMISED', 'RETIRED'])
});

export const AuthenticationProtocolSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  handlerId: z.string().uuid(),
  method: z.nativeEnum(AuthenticationMethod),
  primaryCode: z.string(),
  backupCode: z.string(),
  duressCode: z.string(),
  challengeQuestions: z.array(z.object({
    question: z.string(),
    expectedResponse: z.string()
  })).optional(),
  validFrom: z.date(),
  validTo: z.date(),
  rotationSchedule: z.string(),
  lastRotation: z.date().optional(),
  nextRotation: z.date()
});

export const CommunicationLogSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['MESSAGE', 'CALL', 'VIDEO', 'DEAD_DROP', 'SIGNAL']),
  participants: z.array(z.string().uuid()),
  timestamp: z.date(),
  duration: z.number().optional(),
  method: z.nativeEnum(CommunicationMethod),
  authenticated: z.boolean(),
  duressDetected: z.boolean(),
  securityIncidents: z.array(z.string()).optional(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const EmergencyProtocolSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  triggerConditions: z.array(z.string()),
  emergencyContacts: z.array(z.object({
    name: z.string(),
    method: z.nativeEnum(CommunicationMethod),
    contactInfo: z.string(),
    priority: z.number()
  })),
  evacuationPlan: z.string(),
  safeHouses: z.array(z.string()),
  duressSignals: z.array(z.object({
    signal: z.string(),
    meaning: z.string(),
    responseRequired: z.string()
  })),
  activationDate: z.date().optional(),
  lastReviewed: z.date(),
  status: z.enum(['ACTIVE', 'ACTIVATED', 'COMPLETED', 'INACTIVE'])
});

export const SignalProtocolSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  signalType: z.enum(['VISUAL', 'AUDIO', 'DIGITAL', 'PHYSICAL']),
  meanings: z.array(z.object({
    signal: z.string(),
    meaning: z.string(),
    response: z.string().optional()
  })),
  sourceId: z.string().uuid(),
  handlerId: z.string().uuid(),
  validFrom: z.date(),
  validTo: z.date().optional(),
  lastUsed: z.date().optional()
});

// Type exports
export type SecureMessage = z.infer<typeof SecureMessageSchema>;
export type DeadDrop = z.infer<typeof DeadDropSchema>;
export type CommunicationDevice = z.infer<typeof CommunicationDeviceSchema>;
export type CovertChannel = z.infer<typeof CovertChannelSchema>;
export type AuthenticationProtocol = z.infer<typeof AuthenticationProtocolSchema>;
export type CommunicationLog = z.infer<typeof CommunicationLogSchema>;
export type EmergencyProtocol = z.infer<typeof EmergencyProtocolSchema>;
export type SignalProtocol = z.infer<typeof SignalProtocolSchema>;
