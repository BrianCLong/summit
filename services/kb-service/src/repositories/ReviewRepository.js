"use strict";
/**
 * Review Repository
 * Data access layer for KB content review workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRepository = exports.ReviewRepository = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
function mapRowToReview(row) {
    return {
        id: row.id,
        versionId: row.version_id,
        reviewerId: row.reviewer_id,
        decision: row.decision,
        comments: row.comments ?? undefined,
        reviewedAt: row.reviewed_at,
    };
}
class ReviewRepository {
    async findById(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_reviews WHERE id = $1 AND decision IS NOT NULL', [id]);
        return result.rows[0] ? mapRowToReview(result.rows[0]) : null;
    }
    async findByVersionId(versionId) {
        const result = await (0, connection_js_1.query)(`SELECT * FROM kb_reviews
       WHERE version_id = $1 AND decision IS NOT NULL
       ORDER BY reviewed_at DESC`, [versionId]);
        return result.rows.map(mapRowToReview);
    }
    async getPendingReviewsForReviewer(reviewerId) {
        const result = await (0, connection_js_1.query)(`SELECT * FROM kb_pending_reviews WHERE reviewer_id = $1`, [reviewerId]);
        return result.rows;
    }
    async requestReview(versionId, reviewerIds) {
        await (0, connection_js_1.transaction)(async (client) => {
            // Update version status to pending_review
            await client.query(`UPDATE kb_versions SET status = 'pending_review'::content_status WHERE id = $1`, [versionId]);
            // Create review requests
            for (const reviewerId of reviewerIds) {
                const id = (0, uuid_1.v4)();
                await client.query(`INSERT INTO kb_reviews (id, version_id, reviewer_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (version_id, reviewer_id) DO NOTHING`, [id, versionId, reviewerId]);
            }
        });
    }
    async submitReview(versionId, reviewerId, decision, comments) {
        const result = await (0, connection_js_1.query)(`UPDATE kb_reviews
       SET decision = $1::review_decision, comments = $2, reviewed_at = NOW()
       WHERE version_id = $3 AND reviewer_id = $4
       RETURNING *`, [decision, comments, versionId, reviewerId]);
        if (!result.rows[0]) {
            throw new Error('Review request not found');
        }
        return mapRowToReview(result.rows[0]);
    }
    async getWorkflowState(versionId) {
        // Get version and article info
        const versionResult = await (0, connection_js_1.query)('SELECT id, article_id, status FROM kb_versions WHERE id = $1', [versionId]);
        if (!versionResult.rows[0])
            return null;
        const version = versionResult.rows[0];
        // Get pending reviews
        const pendingResult = await (0, connection_js_1.query)(`SELECT reviewer_id, requested_at FROM kb_reviews
       WHERE version_id = $1 AND decision IS NULL`, [versionId]);
        // Get completed reviews
        const completedResult = await (0, connection_js_1.query)(`SELECT * FROM kb_reviews
       WHERE version_id = $1 AND decision IS NOT NULL`, [versionId]);
        const pendingReviews = pendingResult.rows.map((row) => ({
            reviewerId: row.reviewer_id,
            requestedAt: row.requested_at,
        }));
        const completedReviews = completedResult.rows.map(mapRowToReview);
        // Can publish if:
        // - No pending reviews
        // - At least one approved review
        // - No rejections
        const hasApproval = completedReviews.some((r) => r.decision === 'approved');
        const hasRejection = completedReviews.some((r) => r.decision === 'rejected');
        const canPublish = pendingReviews.length === 0 && hasApproval && !hasRejection;
        return {
            versionId: version.id,
            articleId: version.article_id,
            status: version.status,
            pendingReviews,
            completedReviews,
            canPublish,
        };
    }
    async cancelPendingReviews(versionId) {
        await (0, connection_js_1.query)('DELETE FROM kb_reviews WHERE version_id = $1 AND decision IS NULL', [versionId]);
    }
    async getReviewHistory(articleId) {
        const result = await (0, connection_js_1.query)(`SELECT r.* FROM kb_reviews r
       JOIN kb_versions v ON r.version_id = v.id
       WHERE v.article_id = $1 AND r.decision IS NOT NULL
       ORDER BY r.reviewed_at DESC`, [articleId]);
        return result.rows.map(mapRowToReview);
    }
}
exports.ReviewRepository = ReviewRepository;
exports.reviewRepository = new ReviewRepository();
