"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BallotReceiptSchema = exports.EncryptedBallotSchema = exports.VoteSelectionSchema = exports.ElectionSchema = exports.BallotItemSchema = exports.CandidateSchema = exports.VoterSchema = void 0;
const zod_1 = require("zod");
/**
 * Core Election Types for Secure Digital Democracy Platform
 */
exports.VoterSchema = zod_1.z.object({
    voterId: zod_1.z.string().uuid(),
    jurisdictionId: zod_1.z.string(),
    registrationHash: zod_1.z.string(),
    eligibilityVerified: zod_1.z.boolean(),
    anonymousToken: zod_1.z.string().optional(),
});
exports.CandidateSchema = zod_1.z.object({
    candidateId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    party: zod_1.z.string().optional(),
    position: zod_1.z.string(),
    electionId: zod_1.z.string().uuid(),
});
exports.BallotItemSchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['candidate', 'proposition', 'ranked_choice', 'approval']),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    options: zod_1.z.array(zod_1.z.object({
        optionId: zod_1.z.string(),
        label: zod_1.z.string(),
        candidateId: zod_1.z.string().optional(),
    })),
    maxSelections: zod_1.z.number().default(1),
    minSelections: zod_1.z.number().default(0),
});
exports.ElectionSchema = zod_1.z.object({
    electionId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['general', 'primary', 'special', 'referendum', 'recall']),
    jurisdiction: zod_1.z.string(),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    ballotItems: zod_1.z.array(exports.BallotItemSchema),
    status: zod_1.z.enum(['draft', 'scheduled', 'active', 'closed', 'certified']),
    auditTrailHash: zod_1.z.string().optional(),
});
exports.VoteSelectionSchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid(),
    selectedOptions: zod_1.z.array(zod_1.z.string()),
    rankedChoices: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.EncryptedBallotSchema = zod_1.z.object({
    ballotId: zod_1.z.string().uuid(),
    electionId: zod_1.z.string().uuid(),
    encryptedPayload: zod_1.z.string(),
    voterProof: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    blockIndex: zod_1.z.number().optional(),
});
exports.BallotReceiptSchema = zod_1.z.object({
    receiptId: zod_1.z.string().uuid(),
    ballotHash: zod_1.z.string(),
    confirmationCode: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    verificationUrl: zod_1.z.string(),
});
