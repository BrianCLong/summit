"use strict";
// @ts-nocheck
/**
 * Data Factory Service - Quality Service
 *
 * Implements quality controls including golden questions, disagreement resolution,
 * and inter-annotator agreement calculations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityService = void 0;
const connection_js_1 = require("../db/connection.js");
const index_js_1 = require("../types/index.js");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'quality-service' });
class QualityService {
    auditService;
    sampleService;
    constructor(auditService, sampleService) {
        this.auditService = auditService;
        this.sampleService = sampleService;
    }
    // ============================================================================
    // Golden Question Management
    // ============================================================================
    async insertGoldenQuestions(datasetId, queueId, settings) {
        // Get golden samples for this dataset
        const goldenSamples = await this.sampleService.getGoldenSamples(datasetId, Math.ceil(settings.goldenQuestionFrequency * 100));
        if (goldenSamples.length === 0) {
            logger.warn({ datasetId }, 'No golden samples available for insertion');
            return [];
        }
        const insertedIds = [];
        // Insert golden questions at random intervals
        await (0, connection_js_1.transaction)(async (client) => {
            for (const sample of goldenSamples) {
                // Create a labeling job for this golden sample
                const jobId = await client.query(`INSERT INTO labeling_jobs (
            id, dataset_id, sample_id, task_type, instructions, label_schema_id, priority
          )
          SELECT
            gen_random_uuid(),
            $1,
            $2,
            (SELECT task_type FROM labeling_queues WHERE id = $3),
            'Quality check question - please answer carefully',
            $4,
            100
          RETURNING id`, [datasetId, sample.id, queueId, `golden-${queueId}`]);
                insertedIds.push(jobId.rows[0].id);
            }
        });
        logger.info({ datasetId, count: insertedIds.length }, 'Golden questions inserted');
        return insertedIds;
    }
    async evaluateGoldenResponse(sampleId, labelSet) {
        const sample = await this.sampleService.getById(sampleId);
        if (!sample || !sample.isGolden || !sample.expectedLabel) {
            throw new Error('Sample is not a golden question or has no expected label');
        }
        const expectedLabel = sample.expectedLabel;
        const actualLabel = labelSet.labels;
        // Compare labels (simplified comparison)
        const correct = this.compareLabels(expectedLabel, actualLabel);
        // Update annotator metrics
        await (0, connection_js_1.query)(`UPDATE annotators SET
        golden_question_accuracy = (
          golden_question_accuracy * total_labeled + $1
        ) / (total_labeled + 1)
       WHERE id = $2`, [correct ? 1 : 0, labelSet.annotatorId]);
        await this.auditService.log({
            entityType: 'label',
            entityId: labelSet.id,
            action: 'golden_evaluation',
            actorId: 'system',
            actorRole: 'system',
            metadata: { correct, sampleId },
        });
        return {
            correct,
            expectedLabel,
            actualLabel,
            feedback: correct
                ? 'Correct! Your answer matches the expected label.'
                : 'Incorrect. Please review the guidelines.',
        };
    }
    // ============================================================================
    // Inter-Annotator Agreement
    // ============================================================================
    async calculateAgreement(datasetId) {
        // Get all samples with multiple annotations
        const samplesWithMultipleLabels = await (0, connection_js_1.query)(`SELECT sample_id, COUNT(*) as label_count
       FROM label_sets ls
       JOIN samples s ON ls.sample_id = s.id
       WHERE s.dataset_id = $1
         AND ls.status IN ('completed', 'approved')
       GROUP BY sample_id
       HAVING COUNT(*) >= 2`, [datasetId]);
        if (samplesWithMultipleLabels.rows.length === 0) {
            return { overall: 1.0, bySample: [] };
        }
        const results = [];
        let totalAgreement = 0;
        for (const row of samplesWithMultipleLabels.rows) {
            const labelSetsResult = await (0, connection_js_1.query)(`SELECT id, sample_id, annotator_id, labels, confidence, status
         FROM label_sets
         WHERE sample_id = $1 AND status IN ('completed', 'approved')`, [row.sample_id]);
            const labelSets = labelSetsResult.rows.map((r) => ({
                id: r.id,
                sampleId: r.sample_id,
                annotatorId: r.annotator_id,
                annotatorRole: 'annotator',
                taskType: 'text_classification',
                labels: JSON.parse(r.labels),
                confidence: r.confidence || undefined,
                timeSpent: 0,
                status: r.status,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            const agreementScore = this.calculatePairwiseAgreement(labelSets);
            const majorityLabel = this.getMajorityLabel(labelSets);
            results.push({
                sampleId: row.sample_id,
                labelSets,
                agreementScore,
                majorityLabel,
                needsAdjudication: agreementScore < 0.5,
            });
            totalAgreement += agreementScore;
        }
        const overall = results.length > 0 ? totalAgreement / results.length : 1.0;
        return { overall, bySample: results };
    }
    async calculateCohenKappa(datasetId, annotator1Id, annotator2Id) {
        // Get samples labeled by both annotators
        const result = await (0, connection_js_1.query)(`SELECT
        ls1.sample_id,
        ls1.labels as labels1,
        ls2.labels as labels2
       FROM label_sets ls1
       JOIN label_sets ls2 ON ls1.sample_id = ls2.sample_id
       JOIN samples s ON ls1.sample_id = s.id
       WHERE s.dataset_id = $1
         AND ls1.annotator_id = $2
         AND ls2.annotator_id = $3
         AND ls1.status IN ('completed', 'approved')
         AND ls2.status IN ('completed', 'approved')`, [datasetId, annotator1Id, annotator2Id]);
        if (result.rows.length < 2) {
            return 0; // Not enough overlap
        }
        let agreements = 0;
        for (const row of result.rows) {
            const labels1 = JSON.parse(row.labels1);
            const labels2 = JSON.parse(row.labels2);
            if (this.labelsEqual(labels1, labels2)) {
                agreements++;
            }
        }
        const observedAgreement = agreements / result.rows.length;
        // Simplified expected agreement (assumes uniform distribution)
        const expectedAgreement = 0.5;
        if (expectedAgreement === 1) {
            return 1;
        }
        const kappa = (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
        return Math.max(0, kappa);
    }
    // ============================================================================
    // Disagreement Resolution
    // ============================================================================
    async getSamplesNeedingAdjudication(datasetId, threshold = 0.5, limit = 20) {
        const { bySample } = await this.calculateAgreement(datasetId);
        return bySample
            .filter((r) => r.agreementScore < threshold)
            .slice(0, limit);
    }
    async resolveByMajorityVote(sampleId, resolvedBy) {
        const sample = await this.sampleService.getById(sampleId);
        if (!sample) {
            throw new Error(`Sample not found: ${sampleId}`);
        }
        const labelSets = sample.labels.filter((ls) => ls.status === index_js_1.LabelStatus.COMPLETED || ls.status === index_js_1.LabelStatus.APPROVED);
        if (labelSets.length < 2) {
            return null;
        }
        const majorityLabel = this.getMajorityLabel(labelSets);
        if (!majorityLabel) {
            return null;
        }
        // Create adjudicated label set
        const adjudicatedId = await (0, connection_js_1.query)(`INSERT INTO label_sets (
        id, sample_id, annotator_id, annotator_role, task_type,
        labels, confidence, notes, time_spent, status
      )
      SELECT
        gen_random_uuid(),
        $1,
        (SELECT id FROM annotators WHERE user_id = $2 LIMIT 1),
        'admin',
        $3,
        $4,
        1.0,
        'Resolved by majority vote',
        0,
        'approved'
      RETURNING id`, [
            sampleId,
            resolvedBy,
            labelSets[0].taskType,
            JSON.stringify(majorityLabel),
        ]);
        // Update sample status
        await this.sampleService.updateStatus(sampleId, index_js_1.LabelStatus.APPROVED, resolvedBy);
        await this.auditService.log({
            entityType: 'sample',
            entityId: sampleId,
            action: 'majority_vote_resolution',
            actorId: resolvedBy,
            actorRole: 'admin',
            newState: { resolvedLabel: majorityLabel },
            metadata: { originalLabelCount: labelSets.length },
        });
        logger.info({ sampleId }, 'Disagreement resolved by majority vote');
        const result = await (0, connection_js_1.query)('SELECT * FROM label_sets WHERE id = $1', [adjudicatedId.rows[0].id]);
        const row = result.rows[0];
        return {
            id: row.id,
            sampleId: row.sample_id,
            annotatorId: row.annotator_id,
            annotatorRole: row.annotator_role,
            taskType: row.task_type,
            labels: JSON.parse(row.labels),
            confidence: row.confidence || undefined,
            notes: row.notes || undefined,
            timeSpent: row.time_spent,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async resolveByExpertReview(sampleId, expertLabel, expertId) {
        const sample = await this.sampleService.getById(sampleId);
        if (!sample) {
            throw new Error(`Sample not found: ${sampleId}`);
        }
        // Create expert label set
        const result = await (0, connection_js_1.query)(`INSERT INTO label_sets (
        id, sample_id, annotator_id, annotator_role, task_type,
        labels, confidence, notes, time_spent, status
      )
      SELECT
        gen_random_uuid(),
        $1,
        (SELECT id FROM annotators WHERE user_id = $2 LIMIT 1),
        'quality_lead',
        (SELECT task_type FROM labeling_jobs WHERE sample_id = $1 LIMIT 1),
        $3,
        1.0,
        'Expert review adjudication',
        0,
        'approved'
      RETURNING *`, [sampleId, expertId, JSON.stringify(expertLabel)]);
        // Update sample status
        await this.sampleService.updateStatus(sampleId, index_js_1.LabelStatus.APPROVED, expertId);
        await this.auditService.log({
            entityType: 'sample',
            entityId: sampleId,
            action: 'expert_review_resolution',
            actorId: expertId,
            actorRole: 'quality_lead',
            newState: { expertLabel },
            metadata: {},
        });
        logger.info({ sampleId, expertId }, 'Disagreement resolved by expert review');
        const row = result.rows[0];
        return {
            id: row.id,
            sampleId: row.sample_id,
            annotatorId: row.annotator_id,
            annotatorRole: row.annotator_role,
            taskType: row.task_type,
            labels: JSON.parse(row.labels),
            confidence: row.confidence || undefined,
            notes: row.notes || undefined,
            timeSpent: row.time_spent,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    // ============================================================================
    // Quality Reports
    // ============================================================================
    async generateQualityReport(datasetId) {
        const { overall } = await this.calculateAgreement(datasetId);
        // Golden question accuracy by annotator
        const goldenResult = await (0, connection_js_1.query)(`SELECT
        ls.annotator_id,
        COUNT(*) as total,
        SUM(CASE WHEN ls.labels::text = s.expected_label::text THEN 1 ELSE 0 END) as correct
       FROM label_sets ls
       JOIN samples s ON ls.sample_id = s.id
       WHERE s.dataset_id = $1 AND s.is_golden = true
       GROUP BY ls.annotator_id`, [datasetId]);
        const annotatorAccuracies = goldenResult.rows.map((r) => ({
            annotatorId: r.annotator_id,
            accuracy: parseInt(r.total, 10) > 0
                ? parseInt(r.correct, 10) / parseInt(r.total, 10)
                : 0,
            count: parseInt(r.total, 10),
        }));
        const overallGoldenAccuracy = annotatorAccuracies.length > 0
            ? annotatorAccuracies.reduce((sum, a) => sum + a.accuracy, 0) /
                annotatorAccuracies.length
            : 1;
        // Disagreement stats
        const disagreementResult = await (0, connection_js_1.query)(`WITH sample_agreements AS (
        SELECT
          sample_id,
          COUNT(DISTINCT labels::text) as unique_labels
        FROM label_sets ls
        JOIN samples s ON ls.sample_id = s.id
        WHERE s.dataset_id = $1
        GROUP BY sample_id
        HAVING COUNT(*) >= 2
      )
      SELECT
        SUM(CASE WHEN unique_labels > 1 THEN 1 ELSE 0 END) as needs_adjudication,
        0 as adjudicated
      FROM sample_agreements`, [datasetId]);
        // Label distribution
        const distributionResult = await (0, connection_js_1.query)(`SELECT
        labels->0->>'value' as label_value,
        COUNT(*) as count
       FROM label_sets ls
       JOIN samples s ON ls.sample_id = s.id
       WHERE s.dataset_id = $1 AND ls.status IN ('completed', 'approved')
       GROUP BY labels->0->>'value'`, [datasetId]);
        const labelDistribution = {};
        for (const row of distributionResult.rows) {
            if (row.label_value) {
                labelDistribution[row.label_value] = parseInt(row.count, 10);
            }
        }
        return {
            datasetId,
            overallAgreement: overall,
            goldenQuestionAccuracy: overallGoldenAccuracy,
            annotatorAccuracies,
            disagreementCount: parseInt(disagreementResult.rows[0]?.needs_adjudication || '0', 10),
            adjudicatedCount: parseInt(disagreementResult.rows[0]?.adjudicated || '0', 10),
            labelDistribution,
        };
    }
    // ============================================================================
    // Private Helpers
    // ============================================================================
    compareLabels(expected, actual) {
        // Simplified comparison - compare first label value
        if (actual.length === 0)
            return false;
        const actualValue = actual[0].value;
        const expectedValue = Object.values(expected)[0];
        return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
    }
    labelsEqual(labels1, labels2) {
        if (labels1.length !== labels2.length)
            return false;
        for (let i = 0; i < labels1.length; i++) {
            if (labels1[i].fieldName !== labels2[i].fieldName ||
                JSON.stringify(labels1[i].value) !== JSON.stringify(labels2[i].value)) {
                return false;
            }
        }
        return true;
    }
    calculatePairwiseAgreement(labelSets) {
        if (labelSets.length < 2)
            return 1;
        let agreements = 0;
        let comparisons = 0;
        for (let i = 0; i < labelSets.length; i++) {
            for (let j = i + 1; j < labelSets.length; j++) {
                comparisons++;
                if (this.labelsEqual(labelSets[i].labels, labelSets[j].labels)) {
                    agreements++;
                }
            }
        }
        return comparisons > 0 ? agreements / comparisons : 1;
    }
    getMajorityLabel(labelSets) {
        if (labelSets.length === 0)
            return null;
        const labelCounts = new Map();
        for (const ls of labelSets) {
            const key = JSON.stringify(ls.labels);
            const existing = labelCounts.get(key);
            if (existing) {
                existing.count++;
            }
            else {
                labelCounts.set(key, { count: 1, labels: ls.labels });
            }
        }
        let maxCount = 0;
        let majorityLabel = null;
        for (const { count, labels } of labelCounts.values()) {
            if (count > maxCount) {
                maxCount = count;
                majorityLabel = labels;
            }
        }
        // Only return if there's a clear majority
        if (maxCount > labelSets.length / 2) {
            return majorityLabel;
        }
        return null;
    }
}
exports.QualityService = QualityService;
