"use strict";
/**
 * Data Factory Service - Annotator Service
 *
 * Manages annotator profiles, qualifications, and performance metrics.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotatorService = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'annotator-service' });
class AnnotatorService {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    async create(request, createdBy) {
        const id = (0, uuid_1.v4)();
        const result = await (0, connection_js_1.query)(`INSERT INTO annotators (
        id, user_id, display_name, email, role, task_types, qualifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            id,
            request.userId,
            request.displayName,
            request.email,
            request.role,
            JSON.stringify(request.taskTypes),
            JSON.stringify(request.qualifications || []),
        ]);
        const annotator = this.mapRowToAnnotator(result.rows[0]);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'create_annotator',
            actorId: createdBy,
            actorRole: 'admin',
            newState: annotator,
            metadata: {},
        });
        logger.info({ annotatorId: id, userId: request.userId }, 'Annotator created');
        return annotator;
    }
    async getById(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM annotators WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToAnnotator(result.rows[0]);
    }
    async getByUserId(userId) {
        const result = await (0, connection_js_1.query)('SELECT * FROM annotators WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToAnnotator(result.rows[0]);
    }
    async list(filters) {
        const conditions = [];
        const values = [];
        let paramIndex = 1;
        if (filters?.role) {
            conditions.push(`role = $${paramIndex++}`);
            values.push(filters.role);
        }
        if (filters?.isActive !== undefined) {
            conditions.push(`is_active = $${paramIndex++}`);
            values.push(filters.isActive);
        }
        if (filters?.taskType) {
            conditions.push(`task_types @> $${paramIndex++}`);
            values.push(JSON.stringify([filters.taskType]));
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await (0, connection_js_1.query)(`SELECT * FROM annotators ${whereClause} ORDER BY display_name`, values);
        return result.rows.map((row) => this.mapRowToAnnotator(row));
    }
    async update(id, updates, updatedBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Annotator not found: ${id}`);
        }
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        if (updates.displayName !== undefined) {
            updateFields.push(`display_name = $${paramIndex++}`);
            values.push(updates.displayName);
        }
        if (updates.email !== undefined) {
            updateFields.push(`email = $${paramIndex++}`);
            values.push(updates.email);
        }
        if (updates.role !== undefined) {
            updateFields.push(`role = $${paramIndex++}`);
            values.push(updates.role);
        }
        if (updates.taskTypes !== undefined) {
            updateFields.push(`task_types = $${paramIndex++}`);
            values.push(JSON.stringify(updates.taskTypes));
        }
        if (updates.qualifications !== undefined) {
            updateFields.push(`qualifications = $${paramIndex++}`);
            values.push(JSON.stringify(updates.qualifications));
        }
        if (updates.isActive !== undefined) {
            updateFields.push(`is_active = $${paramIndex++}`);
            values.push(updates.isActive);
        }
        if (updateFields.length === 0) {
            return existing;
        }
        values.push(id);
        await (0, connection_js_1.query)(`UPDATE annotators SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`, values);
        const updated = await this.getById(id);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'update_annotator',
            actorId: updatedBy,
            actorRole: 'admin',
            previousState: existing,
            newState: updated,
            metadata: { changes: Object.keys(updates) },
        });
        return updated;
    }
    async updateMetrics(id) {
        // Recalculate metrics from label_sets
        const metricsResult = await (0, connection_js_1.query)(`SELECT
        COUNT(*) as total_labeled,
        AVG(time_spent) as avg_time
       FROM label_sets WHERE annotator_id = $1`, [id]);
        const goldenResult = await (0, connection_js_1.query)(`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ls.labels::text = s.expected_label::text THEN 1 ELSE 0 END) as correct
       FROM label_sets ls
       JOIN samples s ON ls.sample_id = s.id
       WHERE ls.annotator_id = $1 AND s.is_golden = true`, [id]);
        const rejectionResult = await (0, connection_js_1.query)(`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM label_sets WHERE annotator_id = $1`, [id]);
        const totalLabeled = parseInt(metricsResult.rows[0].total_labeled, 10) || 0;
        const avgTime = parseFloat(metricsResult.rows[0].avg_time) || 0;
        const goldenTotal = parseInt(goldenResult.rows[0].total, 10) || 0;
        const goldenCorrect = parseInt(goldenResult.rows[0].correct, 10) || 0;
        const rejectionTotal = parseInt(rejectionResult.rows[0].total, 10) || 0;
        const rejectionCount = parseInt(rejectionResult.rows[0].rejected, 10) || 0;
        const goldenAccuracy = goldenTotal > 0 ? goldenCorrect / goldenTotal : 1;
        const rejectionRate = rejectionTotal > 0 ? rejectionCount / rejectionTotal : 0;
        await (0, connection_js_1.query)(`UPDATE annotators SET
        total_labeled = $1,
        average_time_per_task = $2,
        golden_question_accuracy = $3,
        rejection_rate = $4
       WHERE id = $5`, [totalLabeled, avgTime, goldenAccuracy, rejectionRate, id]);
        return {
            totalLabeled,
            accuracy: goldenAccuracy,
            goldenQuestionAccuracy: goldenAccuracy,
            averageTimePerTask: avgTime,
            agreementRate: 0.85, // Would need more complex calculation
            rejectionRate,
        };
    }
    async getLeaderboard(metric, limit = 10) {
        let orderBy;
        switch (metric) {
            case 'totalLabeled':
                orderBy = 'total_labeled DESC';
                break;
            case 'accuracy':
                orderBy = 'golden_question_accuracy DESC';
                break;
            case 'speed':
                orderBy = 'average_time_per_task ASC';
                break;
            default:
                orderBy = 'total_labeled DESC';
        }
        const result = await (0, connection_js_1.query)(`SELECT * FROM annotators WHERE is_active = true ORDER BY ${orderBy} LIMIT $1`, [limit]);
        return result.rows.map((row, index) => ({
            ...this.mapRowToAnnotator(row),
            rank: index + 1,
        }));
    }
    async deactivate(id, deactivatedBy) {
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error(`Annotator not found: ${id}`);
        }
        await (0, connection_js_1.query)('UPDATE annotators SET is_active = false WHERE id = $1', [id]);
        await this.auditService.log({
            entityType: 'dataset',
            entityId: id,
            action: 'deactivate_annotator',
            actorId: deactivatedBy,
            actorRole: 'admin',
            metadata: {},
        });
        logger.info({ annotatorId: id }, 'Annotator deactivated');
    }
    mapRowToAnnotator(row) {
        return {
            id: row.id,
            userId: row.user_id,
            displayName: row.display_name,
            email: row.email,
            role: row.role,
            taskTypes: JSON.parse(row.task_types),
            qualifications: JSON.parse(row.qualifications),
            performanceMetrics: {
                totalLabeled: row.total_labeled,
                accuracy: Number(row.accuracy),
                goldenQuestionAccuracy: Number(row.golden_question_accuracy),
                averageTimePerTask: Number(row.average_time_per_task),
                agreementRate: Number(row.agreement_rate),
                rejectionRate: Number(row.rejection_rate),
                lastActiveAt: row.last_active_at || undefined,
            },
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.AnnotatorService = AnnotatorService;
