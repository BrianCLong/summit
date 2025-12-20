import { z } from 'zod';

/**
 * Core Election Types for Secure Digital Democracy Platform
 */

export const VoterSchema = z.object({
  voterId: z.string().uuid(),
  jurisdictionId: z.string(),
  registrationHash: z.string(),
  eligibilityVerified: z.boolean(),
  anonymousToken: z.string().optional(),
});

export const CandidateSchema = z.object({
  candidateId: z.string().uuid(),
  name: z.string(),
  party: z.string().optional(),
  position: z.string(),
  electionId: z.string().uuid(),
});

export const BallotItemSchema = z.object({
  itemId: z.string().uuid(),
  type: z.enum(['candidate', 'proposition', 'ranked_choice', 'approval']),
  title: z.string(),
  description: z.string(),
  options: z.array(z.object({
    optionId: z.string(),
    label: z.string(),
    candidateId: z.string().optional(),
  })),
  maxSelections: z.number().default(1),
  minSelections: z.number().default(0),
});

export const ElectionSchema = z.object({
  electionId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['general', 'primary', 'special', 'referendum', 'recall']),
  jurisdiction: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  ballotItems: z.array(BallotItemSchema),
  status: z.enum(['draft', 'scheduled', 'active', 'closed', 'certified']),
  auditTrailHash: z.string().optional(),
});

export const VoteSelectionSchema = z.object({
  itemId: z.string().uuid(),
  selectedOptions: z.array(z.string()),
  rankedChoices: z.array(z.string()).optional(),
});

export const EncryptedBallotSchema = z.object({
  ballotId: z.string().uuid(),
  electionId: z.string().uuid(),
  encryptedPayload: z.string(),
  voterProof: z.string(),
  timestamp: z.string().datetime(),
  blockIndex: z.number().optional(),
});

export const BallotReceiptSchema = z.object({
  receiptId: z.string().uuid(),
  ballotHash: z.string(),
  confirmationCode: z.string(),
  timestamp: z.string().datetime(),
  verificationUrl: z.string(),
});

export type Voter = z.infer<typeof VoterSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type BallotItem = z.infer<typeof BallotItemSchema>;
export type Election = z.infer<typeof ElectionSchema>;
export type VoteSelection = z.infer<typeof VoteSelectionSchema>;
export type EncryptedBallot = z.infer<typeof EncryptedBallotSchema>;
export type BallotReceipt = z.infer<typeof BallotReceiptSchema>;
