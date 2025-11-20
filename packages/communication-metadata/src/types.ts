import { z } from 'zod';
import { ExtractionResult } from '@intelgraph/metadata-extractor';

/**
 * Communication metadata schemas
 */

// Email metadata schema
export const EmailMetadataSchema = z.object({
  // Headers
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  threadId: z.string().optional(),

  // Sender/recipient information
  from: z.object({
    name: z.string().optional(),
    address: z.string(),
  }).optional(),
  to: z.array(z.object({
    name: z.string().optional(),
    address: z.string(),
  })).optional(),
  cc: z.array(z.object({
    name: z.string().optional(),
    address: z.string(),
  })).optional(),
  bcc: z.array(z.object({
    name: z.string().optional(),
    address: z.string(),
  })).optional(),
  replyTo: z.object({
    name: z.string().optional(),
    address: z.string(),
  }).optional(),

  // Subject and content
  subject: z.string().optional(),
  bodyPreview: z.string().optional(),
  isHtml: z.boolean().optional(),
  charset: z.string().optional(),

  // Timestamps
  date: z.date().optional(),
  receivedDate: z.date().optional(),

  // Routing information
  receivedPath: z.array(z.object({
    from: z.string(),
    by: z.string(),
    timestamp: z.date(),
    protocol: z.string().optional(),
  })).optional(),
  returnPath: z.string().optional(),

  // Attachments
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number(),
    hash: z.string().optional(),
    inline: z.boolean(),
  })).optional(),

  // Email client and server
  xMailer: z.string().optional(),
  userAgent: z.string().optional(),
  xOrigintingIp: z.string().optional(),

  // Security
  spfResult: z.string().optional(),
  dkimResult: z.string().optional(),
  dmarcResult: z.string().optional(),
  hasSignature: z.boolean().optional(),
  isEncrypted: z.boolean().optional(),

  // Flags
  priority: z.enum(['high', 'normal', 'low']).optional(),
  importance: z.enum(['high', 'normal', 'low']).optional(),
  isRead: z.boolean().optional(),
  isFlagged: z.boolean().optional(),
  isDraft: z.boolean().optional(),

  // Additional headers
  customHeaders: z.record(z.string()).optional(),
});

export type EmailMetadata = z.infer<typeof EmailMetadataSchema>;

// Messaging metadata schema (WhatsApp, Signal, Telegram, etc.)
export const MessagingMetadataSchema = z.object({
  platform: z.enum(['whatsapp', 'signal', 'telegram', 'imessage', 'sms', 'other']),
  messageId: z.string().optional(),
  conversationId: z.string().optional(),
  threadId: z.string().optional(),

  // Participants
  sender: z.object({
    userId: z.string(),
    phoneNumber: z.string().optional(),
    username: z.string().optional(),
    displayName: z.string().optional(),
  }).optional(),
  recipients: z.array(z.object({
    userId: z.string(),
    phoneNumber: z.string().optional(),
    username: z.string().optional(),
    displayName: z.string().optional(),
  })).optional(),

  // Content
  contentType: z.enum(['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker']),
  hasMedia: z.boolean(),
  mediaCount: z.number().optional(),
  isForwarded: z.boolean().optional(),
  forwardedFrom: z.string().optional(),

  // Timestamps
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  readAt: z.date().optional(),
  editedAt: z.date().optional(),
  deletedAt: z.date().optional(),

  // Status
  deliveryStatus: z.enum(['sent', 'delivered', 'read', 'failed']).optional(),
  isDeleted: z.boolean().optional(),
  isEdited: z.boolean().optional(),

  // Security
  isEncrypted: z.boolean().default(false),
  encryptionType: z.string().optional(),
  hasDisappearingMessages: z.boolean().optional(),
  disappearAfter: z.number().optional(), // seconds

  // Group chat
  isGroupMessage: z.boolean().optional(),
  groupId: z.string().optional(),
  groupName: z.string().optional(),
  groupParticipants: z.number().optional(),
});

export type MessagingMetadata = z.infer<typeof MessagingMetadataSchema>;

// VoIP call metadata schema
export const VoIPMetadataSchema = z.object({
  platform: z.enum(['skype', 'zoom', 'teams', 'whatsapp', 'facetime', 'other']),
  callId: z.string().optional(),
  meetingId: z.string().optional(),

  // Participants
  caller: z.object({
    userId: z.string(),
    displayName: z.string().optional(),
    phoneNumber: z.string().optional(),
  }).optional(),
  callees: z.array(z.object({
    userId: z.string(),
    displayName: z.string().optional(),
    phoneNumber: z.string().optional(),
  })).optional(),

  // Call details
  callType: z.enum(['audio', 'video', 'screen_share', 'conference']),
  direction: z.enum(['incoming', 'outgoing']),
  status: z.enum(['missed', 'answered', 'rejected', 'cancelled', 'failed']),

  // Timestamps
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // seconds
  ringDuration: z.number().optional(), // seconds

  // Quality metrics
  audioCodec: z.string().optional(),
  videoCodec: z.string().optional(),
  bitrate: z.number().optional(),
  packetLoss: z.number().optional(),
  jitter: z.number().optional(),
  latency: z.number().optional(),

  // Recording
  wasRecorded: z.boolean().optional(),
  recordingId: z.string().optional(),

  // Network
  ipAddress: z.string().optional(),
  localIp: z.string().optional(),
  remoteIp: z.string().optional(),
  serverIp: z.string().optional(),
});

export type VoIPMetadata = z.infer<typeof VoIPMetadataSchema>;

// Communication extraction result
export type CommunicationExtractionResult = ExtractionResult & {
  communication?: {
    email?: EmailMetadata;
    messaging?: MessagingMetadata;
    voip?: VoIPMetadata;
  };
};
