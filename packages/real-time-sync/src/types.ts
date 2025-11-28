import { z } from 'zod';

// Operation types for operational transformation
export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  RETAIN = 'retain',
  UPDATE = 'update'
}

export const OperationSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(OperationType),
  position: z.number(),
  length: z.number().optional(),
  content: z.any().optional(),
  attributes: z.record(z.any()).optional(),
  userId: z.string(),
  timestamp: z.number(),
  version: z.number(),
  // Client-known version the operation was authored against. Used to transform
  // against remote history while preserving intent when rebasing.
  baseVersion: z.number().optional()
});

export const DocumentStateSchema = z.object({
  id: z.string(),
  content: z.any(),
  version: z.number(),
  checksum: z.string().optional(),
  lastModified: z.date(),
  modifiedBy: z.string()
});

export const PresenceSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  documentId: z.string(),
  cursor: z.object({
    position: z.number(),
    selection: z.object({
      start: z.number(),
      end: z.number()
    }).optional()
  }).optional(),
  viewport: z.object({
    top: z.number(),
    bottom: z.number()
  }).optional(),
  status: z.enum(['active', 'idle', 'away']).default('active'),
  lastActivity: z.date(),
  metadata: z.record(z.any()).optional()
});

export const SyncMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('operation'),
    operation: OperationSchema
  }),
  z.object({
    type: z.literal('presence'),
    presence: PresenceSchema
  }),
  z.object({
    type: z.literal('ack'),
    operationId: z.string(),
    version: z.number()
  }),
  z.object({
    type: z.literal('sync_request'),
    documentId: z.string(),
    version: z.number()
  }),
  z.object({
    type: z.literal('sync_response'),
    documentId: z.string(),
    state: DocumentStateSchema,
    operations: z.array(OperationSchema)
  }),
  z.object({
    type: z.literal('conflict'),
    operationId: z.string(),
    conflictingOperations: z.array(OperationSchema)
  })
]);

export const ConflictResolutionSchema = z.object({
  strategy: z.enum(['last_write_wins', 'first_write_wins', 'merge', 'manual']),
  winner: z.string().optional(),
  mergedOperation: OperationSchema.optional()
});

export type Operation = z.infer<typeof OperationSchema>;
export type DocumentState = z.infer<typeof DocumentStateSchema>;
export type Presence = z.infer<typeof PresenceSchema>;
export type SyncMessage = z.infer<typeof SyncMessageSchema>;
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;

// Session management
export interface SyncSession {
  id: string;
  documentId: string;
  userId: string;
  workspaceId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  permissions: string[];
}

export interface DocumentLock {
  documentId: string;
  userId: string;
  lockedAt: Date;
  expiresAt: Date;
  lockType: 'read' | 'write' | 'exclusive';
}
