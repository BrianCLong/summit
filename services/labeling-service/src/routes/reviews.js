"use strict";
/**
 * Review endpoints for labeling service
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReviewRoutes = registerReviewRoutes;
const index_js_1 = require("../types/index.js");
const crypto_js_1 = require("../utils/crypto.js");
async function registerReviewRoutes(server, pool, servicePrivateKey, servicePublicKey, createAuditEvent, requireRole) {
    // Create review
    server.post('/reviews', {
        schema: { body: index_js_1.CreateReviewSchema },
        preHandler: requireRole(index_js_1.UserRole.REVIEWER, index_js_1.UserRole.ADMIN),
    }, async (request, reply) => {
        try {
            const { labelId, approved, feedback, suggestedValue, reasoning } = request.body;
            // Get the label
            const labelResult = await pool.query('SELECT * FROM labels WHERE id = $1', [labelId]);
            if (labelResult.rows.length === 0) {
                reply.status(404);
                return { error: 'Label not found' };
            }
            const label = labelResult.rows[0];
            const id = (0, crypto_js_1.generateReviewId)();
            const createdAt = new Date().toISOString();
            const reviewData = {
                id,
                labelId,
                reviewerId: request.userId,
                approved,
                feedback,
                suggestedValue,
                reasoning,
                createdAt,
            };
            // Sign the review
            const signature = await (0, crypto_js_1.signData)(reviewData, servicePrivateKey);
            const result = await pool.query(`INSERT INTO reviews (
            id, label_id, reviewer_id, approved, feedback,
            suggested_value, reasoning, created_at, signature, public_key
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`, [
                id,
                labelId,
                request.userId,
                approved,
                feedback,
                JSON.stringify(suggestedValue),
                reasoning,
                createdAt,
                signature,
                servicePublicKey,
            ]);
            const row = result.rows[0];
            const review = {
                id: row.id,
                labelId: row.label_id,
                reviewerId: row.reviewer_id,
                approved: row.approved,
                feedback: row.feedback,
                suggestedValue: row.suggested_value,
                reasoning: row.reasoning,
                createdAt: row.created_at,
                signature: row.signature,
            };
            // Update label status
            let newStatus = label.status;
            if (approved) {
                // Check if we have enough approvals
                const reviewsResult = await pool.query('SELECT COUNT(*) as count FROM reviews WHERE label_id = $1 AND approved = true', [labelId]);
                const approvalCount = parseInt(reviewsResult.rows[0].count);
                // Get required reviews from queue
                let requiredReviews = 2; // default
                if (label.queue_id) {
                    const queueResult = await pool.query('SELECT required_reviews FROM queues WHERE id = $1', [label.queue_id]);
                    if (queueResult.rows.length > 0) {
                        requiredReviews = queueResult.rows[0].required_reviews;
                    }
                }
                if (approvalCount >= requiredReviews) {
                    newStatus = index_js_1.LabelStatus.APPROVED;
                }
                else {
                    newStatus = index_js_1.LabelStatus.IN_REVIEW;
                }
            }
            else {
                newStatus = index_js_1.LabelStatus.REJECTED;
            }
            await pool.query('UPDATE labels SET status = $1, reviewed_by = $2, reviewed_at = $3 WHERE id = $4', [newStatus, request.userId, createdAt, labelId]);
            // Create audit event
            await createAuditEvent({
                eventType: approved
                    ? index_js_1.AuditEventType.LABEL_APPROVED
                    : index_js_1.AuditEventType.LABEL_REJECTED,
                userId: request.userId,
                labelId,
                reviewId: id,
                beforeState: { status: label.status },
                afterState: { status: newStatus },
                reasoning,
            });
            server.log.info({ reviewId: id, labelId, approved, userId: request.userId }, 'Review created');
            return review;
        }
        catch (error) {
            server.log.error(error, 'Failed to create review');
            reply.status(500);
            return { error: 'Failed to create review' };
        }
    });
    // Get reviews for a label
    server.get('/labels/:labelId/reviews', async (request, reply) => {
        try {
            const { labelId } = request.params;
            const result = await pool.query('SELECT * FROM reviews WHERE label_id = $1 ORDER BY created_at ASC', [labelId]);
            const reviews = result.rows.map((row) => ({
                id: row.id,
                labelId: row.label_id,
                reviewerId: row.reviewer_id,
                approved: row.approved,
                feedback: row.feedback,
                suggestedValue: row.suggested_value,
                reasoning: row.reasoning,
                createdAt: row.created_at,
                signature: row.signature,
            }));
            return { reviews };
        }
        catch (error) {
            server.log.error(error, 'Failed to get reviews');
            reply.status(500);
            return { error: 'Failed to retrieve reviews' };
        }
    });
    // Get review by ID
    server.get('/reviews/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [
                id,
            ]);
            if (result.rows.length === 0) {
                reply.status(404);
                return { error: 'Review not found' };
            }
            const row = result.rows[0];
            const review = {
                id: row.id,
                labelId: row.label_id,
                reviewerId: row.reviewer_id,
                approved: row.approved,
                feedback: row.feedback,
                suggestedValue: row.suggested_value,
                reasoning: row.reasoning,
                createdAt: row.created_at,
                signature: row.signature,
            };
            return review;
        }
        catch (error) {
            server.log.error(error, 'Failed to get review');
            reply.status(500);
            return { error: 'Failed to retrieve review' };
        }
    });
    // Verify review signature
    server.post('/reviews/verify', async (request, reply) => {
        try {
            const { reviewId } = request.body;
            const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [
                reviewId,
            ]);
            if (result.rows.length === 0) {
                reply.status(404);
                return { error: 'Review not found' };
            }
            const row = result.rows[0];
            const reviewData = {
                id: row.id,
                labelId: row.label_id,
                reviewerId: row.reviewer_id,
                approved: row.approved,
                feedback: row.feedback,
                suggestedValue: row.suggested_value,
                reasoning: row.reasoning,
                createdAt: row.created_at,
            };
            const { verifySignature } = await Promise.resolve().then(() => __importStar(require('../utils/crypto.js')));
            const isValid = await verifySignature(reviewData, row.signature, row.public_key || servicePublicKey);
            return {
                reviewId,
                valid: isValid,
                signature: row.signature,
                publicKey: row.public_key || servicePublicKey,
                verifiedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            server.log.error(error, 'Failed to verify review signature');
            reply.status(500);
            return { error: 'Failed to verify signature' };
        }
    });
}
