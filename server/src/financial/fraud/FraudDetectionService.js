"use strict";
/**
 * Fraud Detection Service
 *
 * AML (Anti-Money Laundering), KYC (Know Your Customer), and transaction
 * monitoring for detecting suspicious activities and ensuring compliance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudDetectionService = void 0;
const crypto_1 = require("crypto");
const DEFAULT_CONFIG = {
    structuringThreshold: 10000,
    structuringWindowDays: 7,
    velocityThresholdPerDay: 50000,
    velocityThresholdPerWeek: 200000,
    geographicRiskCountries: ['IR', 'KP', 'SY', 'CU', 'VE', 'MM', 'RU', 'BY'],
    pepScreeningEnabled: true,
    sanctionsScreeningEnabled: true,
    adverseMediaScreeningEnabled: true,
};
class FraudDetectionService {
    pg;
    config;
    constructor(pg, config) {
        this.pg = pg;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    // ============================================================================
    // REAL-TIME TRANSACTION MONITORING
    // ============================================================================
    /**
     * Analyze a transaction for potential fraud
     */
    async analyzeTransaction(transaction) {
        const alerts = [];
        // Run all detection rules
        const structuringAlert = await this.detectStructuring(transaction);
        if (structuringAlert)
            alerts.push(structuringAlert);
        const velocityAlert = await this.detectVelocityAnomaly(transaction);
        if (velocityAlert)
            alerts.push(velocityAlert);
        const geographicAlert = await this.detectGeographicAnomaly(transaction);
        if (geographicAlert)
            alerts.push(geographicAlert);
        const behaviorAlert = await this.detectBehaviorChange(transaction);
        if (behaviorAlert)
            alerts.push(behaviorAlert);
        const sanctionsAlert = await this.checkSanctions(transaction);
        if (sanctionsAlert)
            alerts.push(sanctionsAlert);
        // Store alerts
        for (const alert of alerts) {
            await this.storeAlert(alert);
        }
        return alerts;
    }
    /**
     * Detect structuring (smurfing) - breaking up transactions to avoid reporting
     */
    async detectStructuring(transaction) {
        // Get recent transactions just below the reporting threshold
        const { rows } = await this.pg.query(`SELECT
         COUNT(*) as tx_count,
         SUM(amount) as total_amount,
         array_agg(transaction_id) as transaction_ids
       FROM transactions
       WHERE tenant_id = $1
         AND customer_id = $2
         AND timestamp >= NOW() - INTERVAL '${this.config.structuringWindowDays} days'
         AND amount >= $3 * 0.8
         AND amount < $3`, [
            transaction.tenantId,
            transaction.customerId,
            this.config.structuringThreshold,
        ]);
        const txCount = parseInt(rows[0]?.tx_count || '0', 10);
        const totalAmount = parseFloat(rows[0]?.total_amount || '0');
        // Check if pattern suggests structuring
        if (txCount >= 3 && totalAmount >= this.config.structuringThreshold * 1.5) {
            const indicators = [
                {
                    indicatorType: 'transaction_count',
                    indicatorValue: txCount,
                    weight: 0.3,
                    description: `${txCount} transactions just below reporting threshold`,
                    threshold: 3,
                },
                {
                    indicatorType: 'total_amount',
                    indicatorValue: totalAmount,
                    weight: 0.4,
                    description: `Total: $${totalAmount.toLocaleString()} over ${this.config.structuringWindowDays} days`,
                },
                {
                    indicatorType: 'pattern_match',
                    indicatorValue: 'structuring',
                    weight: 0.3,
                    description: 'Pattern consistent with structuring behavior',
                },
            ];
            const riskScore = this.calculateRiskScore(indicators);
            return this.createAlert({
                tenantId: transaction.tenantId,
                alertType: 'structuring',
                severity: riskScore > 80 ? 'critical' : riskScore > 60 ? 'high' : 'medium',
                riskScore,
                title: `Potential Structuring Detected`,
                description: `${txCount} transactions totaling $${totalAmount.toLocaleString()} just below the $${this.config.structuringThreshold.toLocaleString()} reporting threshold`,
                entityType: 'customer',
                entityId: transaction.customerId,
                relatedEntities: [transaction.accountId],
                indicators,
            });
        }
        return null;
    }
    /**
     * Detect velocity anomalies - unusual transaction frequency or volume
     */
    async detectVelocityAnomaly(transaction) {
        // Get daily and weekly totals
        const { rows } = await this.pg.query(`SELECT
         COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '1 day' THEN amount ELSE 0 END), 0) as daily_total,
         COALESCE(SUM(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as weekly_total,
         COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '1 day' THEN 1 END) as daily_count,
         COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_count
       FROM transactions
       WHERE tenant_id = $1 AND customer_id = $2`, [transaction.tenantId, transaction.customerId]);
        const dailyTotal = parseFloat(rows[0]?.daily_total || '0') + transaction.amount;
        const weeklyTotal = parseFloat(rows[0]?.weekly_total || '0') + transaction.amount;
        const indicators = [];
        if (dailyTotal > this.config.velocityThresholdPerDay) {
            indicators.push({
                indicatorType: 'daily_velocity',
                indicatorValue: dailyTotal,
                weight: 0.5,
                description: `Daily total: $${dailyTotal.toLocaleString()} exceeds threshold of $${this.config.velocityThresholdPerDay.toLocaleString()}`,
                threshold: this.config.velocityThresholdPerDay,
            });
        }
        if (weeklyTotal > this.config.velocityThresholdPerWeek) {
            indicators.push({
                indicatorType: 'weekly_velocity',
                indicatorValue: weeklyTotal,
                weight: 0.5,
                description: `Weekly total: $${weeklyTotal.toLocaleString()} exceeds threshold of $${this.config.velocityThresholdPerWeek.toLocaleString()}`,
                threshold: this.config.velocityThresholdPerWeek,
            });
        }
        if (indicators.length > 0) {
            const riskScore = this.calculateRiskScore(indicators);
            return this.createAlert({
                tenantId: transaction.tenantId,
                alertType: 'velocity_anomaly',
                severity: riskScore > 80 ? 'high' : 'medium',
                riskScore,
                title: `Velocity Anomaly Detected`,
                description: `Unusual transaction volume detected for customer`,
                entityType: 'customer',
                entityId: transaction.customerId,
                relatedEntities: [transaction.transactionId],
                indicators,
            });
        }
        return null;
    }
    /**
     * Detect geographic anomalies - transactions from high-risk countries
     */
    async detectGeographicAnomaly(transaction) {
        if (!transaction.counterpartyCountry)
            return null;
        const isHighRisk = this.config.geographicRiskCountries.includes(transaction.counterpartyCountry);
        if (isHighRisk) {
            const indicators = [
                {
                    indicatorType: 'high_risk_country',
                    indicatorValue: transaction.counterpartyCountry,
                    weight: 0.7,
                    description: `Transaction involves high-risk jurisdiction: ${transaction.counterpartyCountry}`,
                },
                {
                    indicatorType: 'amount',
                    indicatorValue: transaction.amount,
                    weight: 0.3,
                    description: `Transaction amount: $${transaction.amount.toLocaleString()}`,
                },
            ];
            const riskScore = transaction.amount > 10000 ? 85 : 65;
            return this.createAlert({
                tenantId: transaction.tenantId,
                alertType: 'geographic_anomaly',
                severity: riskScore > 80 ? 'high' : 'medium',
                riskScore,
                title: `High-Risk Geographic Activity`,
                description: `Transaction with counterparty in ${transaction.counterpartyCountry}`,
                entityType: 'transaction',
                entityId: transaction.transactionId,
                relatedEntities: [transaction.customerId],
                indicators,
            });
        }
        return null;
    }
    /**
     * Detect behavior changes - deviation from normal patterns
     */
    async detectBehaviorChange(transaction) {
        // Get customer's historical behavior profile
        const { rows } = await this.pg.query(`SELECT
         AVG(amount) as avg_amount,
         STDDEV(amount) as stddev_amount,
         COUNT(DISTINCT channel) as usual_channels,
         MODE() WITHIN GROUP (ORDER BY channel) as preferred_channel,
         AVG(EXTRACT(HOUR FROM timestamp)) as avg_hour
       FROM transactions
       WHERE tenant_id = $1
         AND customer_id = $2
         AND timestamp >= NOW() - INTERVAL '90 days'
         AND timestamp < NOW() - INTERVAL '1 day'`, [transaction.tenantId, transaction.customerId]);
        if (!rows[0]?.avg_amount)
            return null; // New customer, no history
        const avgAmount = parseFloat(rows[0].avg_amount);
        const stddevAmount = parseFloat(rows[0].stddev_amount || '0');
        const preferredChannel = rows[0].preferred_channel;
        const indicators = [];
        // Check for unusual amount
        if (stddevAmount > 0) {
            const zScore = (transaction.amount - avgAmount) / stddevAmount;
            if (Math.abs(zScore) > 3) {
                indicators.push({
                    indicatorType: 'unusual_amount',
                    indicatorValue: zScore,
                    weight: 0.5,
                    description: `Transaction amount ${transaction.amount} is ${zScore.toFixed(1)} std devs from average`,
                });
            }
        }
        // Check for unusual channel
        if (preferredChannel && transaction.channel !== preferredChannel) {
            indicators.push({
                indicatorType: 'unusual_channel',
                indicatorValue: transaction.channel,
                weight: 0.3,
                description: `Transaction via ${transaction.channel}, usual channel is ${preferredChannel}`,
            });
        }
        if (indicators.length >= 2) {
            const riskScore = this.calculateRiskScore(indicators);
            return this.createAlert({
                tenantId: transaction.tenantId,
                alertType: 'behavior_change',
                severity: 'medium',
                riskScore,
                title: `Behavior Change Detected`,
                description: `Transaction deviates from customer's normal patterns`,
                entityType: 'customer',
                entityId: transaction.customerId,
                relatedEntities: [transaction.transactionId],
                indicators,
            });
        }
        return null;
    }
    /**
     * Check transaction against sanctions lists
     */
    async checkSanctions(transaction) {
        if (!this.config.sanctionsScreeningEnabled)
            return null;
        if (!transaction.counterpartyName)
            return null;
        // Check against sanctions list
        const { rows } = await this.pg.query(`SELECT
         entity_name,
         list_type,
         match_score
       FROM sanctions_list
       WHERE similarity(entity_name, $1) > 0.7
         OR entity_name ILIKE '%' || $1 || '%'
       ORDER BY match_score DESC
       LIMIT 1`, [transaction.counterpartyName]);
        if (rows.length > 0) {
            const match = rows[0];
            const indicators = [
                {
                    indicatorType: 'sanctions_match',
                    indicatorValue: match.entity_name,
                    weight: 0.9,
                    description: `Potential match to ${match.list_type} list: ${match.entity_name}`,
                },
                {
                    indicatorType: 'match_score',
                    indicatorValue: match.match_score,
                    weight: 0.1,
                    description: `Match confidence: ${(match.match_score * 100).toFixed(0)}%`,
                },
            ];
            return this.createAlert({
                tenantId: transaction.tenantId,
                alertType: 'sanctions_hit',
                severity: 'critical',
                riskScore: 95,
                title: `Potential Sanctions Match`,
                description: `Counterparty ${transaction.counterpartyName} potentially matches ${match.list_type} list`,
                entityType: 'transaction',
                entityId: transaction.transactionId,
                relatedEntities: [transaction.customerId],
                indicators,
            });
        }
        return null;
    }
    // ============================================================================
    // KYC MANAGEMENT
    // ============================================================================
    /**
     * Perform KYC screening for a customer
     */
    async performKYCScreening(tenantId, customerId, customerData) {
        const existingProfile = await this.getKYCProfile(tenantId, customerId);
        // PEP screening
        let pepStatus = false;
        let pepDetails;
        if (this.config.pepScreeningEnabled) {
            const pepResult = await this.screenForPEP(customerData.fullName, customerData.nationality);
            pepStatus = pepResult.isMatch;
            pepDetails = pepResult.details;
        }
        // Sanctions screening
        let sanctionsStatus = 'clear';
        let sanctionsDetails;
        if (this.config.sanctionsScreeningEnabled) {
            const sanctionsResult = await this.screenForSanctions(customerData.fullName);
            sanctionsStatus = sanctionsResult.status;
            sanctionsDetails = sanctionsResult.details;
        }
        // Adverse media screening
        let adverseMedia = false;
        let adverseMediaDetails;
        if (this.config.adverseMediaScreeningEnabled) {
            const mediaResult = await this.screenForAdverseMedia(customerData.fullName);
            adverseMedia = mediaResult.hasAdverseMedia;
            adverseMediaDetails = mediaResult.details;
        }
        // Calculate risk rating
        const riskRating = this.calculateKYCRiskRating({
            countryOfResidence: customerData.countryOfResidence,
            pepStatus,
            sanctionsStatus,
            adverseMedia,
            customerType: customerData.customerType,
        });
        // Determine verification level required
        const verificationLevel = this.determineVerificationLevel(riskRating);
        const profile = {
            customerId,
            tenantId,
            customerType: customerData.customerType,
            fullName: customerData.fullName,
            dateOfBirth: customerData.dateOfBirth,
            nationality: customerData.nationality,
            countryOfResidence: customerData.countryOfResidence,
            riskRating,
            kycStatus: sanctionsStatus === 'match' ? 'rejected' : 'pending',
            verificationLevel,
            pepStatus,
            pepDetails,
            sanctionsStatus,
            sanctionsDetails,
            adverseMedia,
            adverseMediaDetails,
            lastReviewDate: new Date(),
            nextReviewDate: this.calculateNextReviewDate(riskRating),
            documents: existingProfile?.documents || [],
        };
        await this.storeKYCProfile(profile);
        // Generate alerts for high-risk findings
        if (pepStatus || sanctionsStatus !== 'clear' || adverseMedia) {
            await this.generateKYCAlert(profile);
        }
        return profile;
    }
    /**
     * Screen for Politically Exposed Persons
     */
    async screenForPEP(name, nationality) {
        const { rows } = await this.pg.query(`SELECT pep_name, position, country, match_score
       FROM pep_list
       WHERE similarity(pep_name, $1) > 0.8
         ${nationality ? 'AND (country = $2 OR country IS NULL)' : ''}
       ORDER BY match_score DESC
       LIMIT 1`, nationality ? [name, nationality] : [name]);
        if (rows.length > 0) {
            return {
                isMatch: true,
                details: `Potential PEP match: ${rows[0].pep_name}, ${rows[0].position} (${rows[0].country})`,
            };
        }
        return { isMatch: false };
    }
    /**
     * Screen against sanctions lists
     */
    async screenForSanctions(name) {
        const { rows } = await this.pg.query(`SELECT entity_name, list_type, similarity(entity_name, $1) as score
       FROM sanctions_list
       WHERE similarity(entity_name, $1) > 0.6
       ORDER BY score DESC
       LIMIT 1`, [name]);
        if (rows.length === 0) {
            return { status: 'clear' };
        }
        const score = rows[0].score;
        if (score > 0.9) {
            return {
                status: 'match',
                details: `Match to ${rows[0].list_type}: ${rows[0].entity_name} (${(score * 100).toFixed(0)}% confidence)`,
            };
        }
        return {
            status: 'potential_match',
            details: `Potential match to ${rows[0].list_type}: ${rows[0].entity_name} (${(score * 100).toFixed(0)}% confidence)`,
        };
    }
    /**
     * Screen for adverse media
     */
    async screenForAdverseMedia(name) {
        const { rows } = await this.pg.query(`SELECT headline, source, category, published_date
       FROM adverse_media
       WHERE similarity(entity_name, $1) > 0.8
         AND published_date >= NOW() - INTERVAL '5 years'
       ORDER BY published_date DESC
       LIMIT 5`, [name]);
        if (rows.length > 0) {
            const categories = [...new Set(rows.map((r) => r.category))];
            return {
                hasAdverseMedia: true,
                details: `${rows.length} adverse media articles found. Categories: ${categories.join(', ')}`,
            };
        }
        return { hasAdverseMedia: false };
    }
    /**
     * Calculate KYC risk rating
     */
    calculateKYCRiskRating(factors) {
        let riskScore = 0;
        // Country risk
        if (this.config.geographicRiskCountries.includes(factors.countryOfResidence)) {
            riskScore += 30;
        }
        // PEP status
        if (factors.pepStatus) {
            riskScore += 25;
        }
        // Sanctions status
        if (factors.sanctionsStatus === 'match') {
            riskScore += 50;
        }
        else if (factors.sanctionsStatus === 'potential_match') {
            riskScore += 25;
        }
        // Adverse media
        if (factors.adverseMedia) {
            riskScore += 20;
        }
        // Customer type
        if (factors.customerType === 'corporate') {
            riskScore += 10;
        }
        if (riskScore >= 80)
            return 'severe';
        if (riskScore >= 60)
            return 'high';
        if (riskScore >= 40)
            return 'moderate';
        if (riskScore >= 20)
            return 'low';
        return 'minimal';
    }
    /**
     * Determine verification level based on risk
     */
    determineVerificationLevel(riskRating) {
        switch (riskRating) {
            case 'severe':
            case 'high':
                return 'enhanced';
            case 'moderate':
                return 'standard';
            default:
                return 'basic';
        }
    }
    /**
     * Calculate next review date based on risk
     */
    calculateNextReviewDate(riskRating) {
        const now = new Date();
        const reviewPeriods = {
            minimal: 365 * 3, // 3 years
            low: 365 * 2, // 2 years
            moderate: 365, // 1 year
            high: 180, // 6 months
            severe: 90, // 3 months
        };
        const days = reviewPeriods[riskRating];
        return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }
    // ============================================================================
    // AML CASE MANAGEMENT
    // ============================================================================
    /**
     * Create an AML investigation case
     */
    async createAMLCase(tenantId, customerId, alertIds, assignedTo, caseType = 'investigation') {
        const caseId = (0, crypto_1.randomUUID)();
        // Get customer name
        const { rows: customerRows } = await this.pg.query(`SELECT full_name FROM kyc_profiles WHERE customer_id = $1 AND tenant_id = $2`, [customerId, tenantId]);
        // Calculate initial risk level based on alerts
        const { rows: alertRows } = await this.pg.query(`SELECT AVG(risk_score) as avg_score FROM fraud_alerts WHERE alert_id = ANY($1)`, [alertIds]);
        const avgScore = parseFloat(alertRows[0]?.avg_score || '50');
        const riskLevel = this.scoreToRiskLevel(avgScore);
        // Get related transactions
        const { rows: txRows } = await this.pg.query(`SELECT DISTINCT unnest(related_entities) as tx_id
       FROM fraud_alerts
       WHERE alert_id = ANY($1)`, [alertIds]);
        const amlCase = {
            caseId,
            tenantId,
            customerId,
            customerName: customerRows[0]?.full_name || 'Unknown',
            caseType,
            status: 'open',
            riskLevel,
            assignedTo,
            createdAt: new Date(),
            dueDate: this.calculateCaseDueDate(riskLevel),
            alerts: alertIds,
            transactions: txRows.map((r) => r.tx_id),
            findings: '',
        };
        await this.storeAMLCase(amlCase);
        // Link alerts to case
        await this.pg.query(`UPDATE fraud_alerts SET case_id = $1, status = 'investigating' WHERE alert_id = ANY($2)`, [caseId, alertIds]);
        return amlCase;
    }
    /**
     * Update AML case with findings
     */
    async updateAMLCase(caseId, updates) {
        const setClauses = ['updated_at = NOW()'];
        const params = [];
        let paramIndex = 1;
        if (updates.status) {
            setClauses.push(`status = $${paramIndex}`);
            params.push(updates.status);
            paramIndex++;
        }
        if (updates.findings) {
            setClauses.push(`findings = $${paramIndex}`);
            params.push(updates.findings);
            paramIndex++;
        }
        if (updates.recommendation) {
            setClauses.push(`recommendation = $${paramIndex}`);
            params.push(updates.recommendation);
            paramIndex++;
        }
        if (updates.supervisorReview) {
            setClauses.push(`supervisor_review = $${paramIndex}`);
            params.push(updates.supervisorReview);
            paramIndex++;
        }
        params.push(caseId);
        await this.pg.query(`UPDATE aml_cases SET ${setClauses.join(', ')} WHERE case_id = $${paramIndex}`, params);
    }
    /**
     * File a Suspicious Activity Report (SAR)
     */
    async fileSAR(caseId, filedBy, sarData) {
        const sarReferenceNumber = `SAR-${Date.now()}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
        // Store SAR record
        await this.pg.query(`INSERT INTO sar_filings (
        sar_reference, case_id, subject_name, subject_id, activity_summary,
        amount_involved, activity_start_date, activity_end_date,
        suspicious_activity_types, filed_by, filed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`, [
            sarReferenceNumber,
            caseId,
            sarData.subjectName,
            sarData.subjectId,
            sarData.activitySummary,
            sarData.amountInvolved,
            sarData.activityDates.start,
            sarData.activityDates.end,
            sarData.suspiciousActivityType,
            filedBy,
        ]);
        // Update case
        await this.pg.query(`UPDATE aml_cases
       SET status = 'sar_filed', sar_reference_number = $1
       WHERE case_id = $2`, [sarReferenceNumber, caseId]);
        // Update related alerts
        await this.pg.query(`UPDATE fraud_alerts
       SET sar_filed = true, sar_filing_date = NOW()
       WHERE case_id = $1`, [caseId]);
        return { sarReferenceNumber };
    }
    // ============================================================================
    // ALERT MANAGEMENT
    // ============================================================================
    /**
     * Get fraud alerts with filtering
     */
    async getAlerts(tenantId, filters) {
        const conditions = ['tenant_id = $1'];
        const params = [tenantId];
        let paramIndex = 2;
        if (filters?.status?.length) {
            conditions.push(`status = ANY($${paramIndex})`);
            params.push(filters.status);
            paramIndex++;
        }
        if (filters?.severity?.length) {
            conditions.push(`severity = ANY($${paramIndex})`);
            params.push(filters.severity);
            paramIndex++;
        }
        if (filters?.alertType?.length) {
            conditions.push(`alert_type = ANY($${paramIndex})`);
            params.push(filters.alertType);
            paramIndex++;
        }
        if (filters?.startDate) {
            conditions.push(`detected_at >= $${paramIndex}`);
            params.push(filters.startDate);
            paramIndex++;
        }
        if (filters?.endDate) {
            conditions.push(`detected_at <= $${paramIndex}`);
            params.push(filters.endDate);
            paramIndex++;
        }
        if (filters?.entityId) {
            conditions.push(`entity_id = $${paramIndex}`);
            params.push(filters.entityId);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        const countResult = await this.pg.query(`SELECT COUNT(*) FROM fraud_alerts WHERE ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        const { rows } = await this.pg.query(`SELECT * FROM fraud_alerts
       WHERE ${whereClause}
       ORDER BY detected_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset]);
        return {
            alerts: rows.map(this.mapAlertRow),
            total,
        };
    }
    /**
     * Update alert status
     */
    async updateAlertStatus(alertId, status, userId, resolution) {
        const updates = ['status = $2', 'updated_at = NOW()'];
        const params = [alertId, status];
        if (status === 'resolved' || status === 'false_positive') {
            updates.push('resolved_at = NOW()');
            updates.push('resolved_by = $3');
            updates.push('resolution = $4');
            params.push(userId, resolution);
        }
        else if (status === 'acknowledged') {
            updates.push('assigned_to = $3');
            params.push(userId);
        }
        await this.pg.query(`UPDATE fraud_alerts SET ${updates.join(', ')} WHERE alert_id = $1`, params);
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    createAlert(params) {
        return {
            alertId: (0, crypto_1.randomUUID)(),
            tenantId: params.tenantId,
            alertType: params.alertType,
            severity: params.severity,
            status: 'open',
            riskScore: params.riskScore,
            title: params.title,
            description: params.description,
            detectedAt: new Date(),
            entityType: params.entityType,
            entityId: params.entityId,
            relatedEntities: params.relatedEntities,
            indicators: params.indicators,
        };
    }
    calculateRiskScore(indicators) {
        const totalWeight = indicators.reduce((sum, i) => sum + i.weight, 0);
        if (totalWeight === 0)
            return 0;
        // Normalize weights and calculate weighted score
        let score = 0;
        for (const indicator of indicators) {
            const normalizedWeight = indicator.weight / totalWeight;
            // Each indicator contributes up to 100 points
            score += normalizedWeight * 100;
        }
        return Math.min(100, Math.round(score));
    }
    scoreToRiskLevel(score) {
        if (score >= 80)
            return 'severe';
        if (score >= 60)
            return 'high';
        if (score >= 40)
            return 'moderate';
        if (score >= 20)
            return 'low';
        return 'minimal';
    }
    calculateCaseDueDate(riskLevel) {
        const now = new Date();
        const dueDays = {
            severe: 3,
            high: 7,
            moderate: 14,
            low: 30,
            minimal: 45,
        };
        return new Date(now.getTime() + dueDays[riskLevel] * 24 * 60 * 60 * 1000);
    }
    async storeAlert(alert) {
        await this.pg.query(`INSERT INTO fraud_alerts (
        alert_id, tenant_id, alert_type, severity, status, risk_score,
        title, description, detected_at, entity_type, entity_id,
        related_entities, indicators
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
            alert.alertId,
            alert.tenantId,
            alert.alertType,
            alert.severity,
            alert.status,
            alert.riskScore,
            alert.title,
            alert.description,
            alert.detectedAt,
            alert.entityType,
            alert.entityId,
            JSON.stringify(alert.relatedEntities),
            JSON.stringify(alert.indicators),
        ]);
    }
    async storeKYCProfile(profile) {
        await this.pg.query(`INSERT INTO kyc_profiles (
        customer_id, tenant_id, customer_type, full_name, date_of_birth,
        nationality, country_of_residence, risk_rating, kyc_status,
        verification_level, pep_status, pep_details, sanctions_status,
        sanctions_details, adverse_media, adverse_media_details,
        last_review_date, next_review_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (customer_id, tenant_id) DO UPDATE SET
        risk_rating = EXCLUDED.risk_rating,
        kyc_status = EXCLUDED.kyc_status,
        verification_level = EXCLUDED.verification_level,
        pep_status = EXCLUDED.pep_status,
        pep_details = EXCLUDED.pep_details,
        sanctions_status = EXCLUDED.sanctions_status,
        sanctions_details = EXCLUDED.sanctions_details,
        adverse_media = EXCLUDED.adverse_media,
        adverse_media_details = EXCLUDED.adverse_media_details,
        last_review_date = EXCLUDED.last_review_date,
        next_review_date = EXCLUDED.next_review_date,
        updated_at = NOW()`, [
            profile.customerId,
            profile.tenantId,
            profile.customerType,
            profile.fullName,
            profile.dateOfBirth,
            profile.nationality,
            profile.countryOfResidence,
            profile.riskRating,
            profile.kycStatus,
            profile.verificationLevel,
            profile.pepStatus,
            profile.pepDetails,
            profile.sanctionsStatus,
            profile.sanctionsDetails,
            profile.adverseMedia,
            profile.adverseMediaDetails,
            profile.lastReviewDate,
            profile.nextReviewDate,
        ]);
    }
    async storeAMLCase(amlCase) {
        await this.pg.query(`INSERT INTO aml_cases (
        case_id, tenant_id, customer_id, customer_name, case_type,
        status, risk_level, assigned_to, created_at, due_date, alerts, transactions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
            amlCase.caseId,
            amlCase.tenantId,
            amlCase.customerId,
            amlCase.customerName,
            amlCase.caseType,
            amlCase.status,
            amlCase.riskLevel,
            amlCase.assignedTo,
            amlCase.createdAt,
            amlCase.dueDate,
            JSON.stringify(amlCase.alerts),
            JSON.stringify(amlCase.transactions),
        ]);
    }
    async getKYCProfile(tenantId, customerId) {
        const { rows } = await this.pg.query(`SELECT * FROM kyc_profiles WHERE customer_id = $1 AND tenant_id = $2`, [customerId, tenantId]);
        return rows[0] ? this.mapKYCRow(rows[0]) : null;
    }
    async generateKYCAlert(profile) {
        const indicators = [];
        if (profile.pepStatus) {
            indicators.push({
                indicatorType: 'pep_match',
                indicatorValue: 'true',
                weight: 0.3,
                description: profile.pepDetails || 'PEP match found',
            });
        }
        if (profile.sanctionsStatus !== 'clear') {
            indicators.push({
                indicatorType: 'sanctions_status',
                indicatorValue: profile.sanctionsStatus,
                weight: profile.sanctionsStatus === 'match' ? 0.5 : 0.3,
                description: profile.sanctionsDetails || 'Sanctions screening flag',
            });
        }
        if (profile.adverseMedia) {
            indicators.push({
                indicatorType: 'adverse_media',
                indicatorValue: 'true',
                weight: 0.2,
                description: profile.adverseMediaDetails || 'Adverse media found',
            });
        }
        const alertType = profile.sanctionsStatus === 'match'
            ? 'sanctions_hit'
            : profile.pepStatus
                ? 'pep_match'
                : 'adverse_media';
        const alert = this.createAlert({
            tenantId: profile.tenantId,
            alertType,
            severity: profile.sanctionsStatus === 'match' ? 'critical' : 'high',
            riskScore: this.calculateRiskScore(indicators),
            title: `KYC Screening Alert: ${profile.fullName}`,
            description: `KYC screening identified risk factors for customer`,
            entityType: 'customer',
            entityId: profile.customerId,
            relatedEntities: [],
            indicators,
        });
        await this.storeAlert(alert);
    }
    mapAlertRow(row) {
        return {
            alertId: row.alert_id,
            tenantId: row.tenant_id,
            alertType: row.alert_type,
            severity: row.severity,
            status: row.status,
            riskScore: row.risk_score,
            title: row.title,
            description: row.description,
            detectedAt: row.detected_at,
            entityType: row.entity_type,
            entityId: row.entity_id,
            relatedEntities: JSON.parse(row.related_entities || '[]'),
            indicators: JSON.parse(row.indicators || '[]'),
            assignedTo: row.assigned_to,
            resolvedAt: row.resolved_at,
            resolvedBy: row.resolved_by,
            resolution: row.resolution,
            sarFiled: row.sar_filed,
            sarFilingDate: row.sar_filing_date,
        };
    }
    mapKYCRow(row) {
        return {
            customerId: row.customer_id,
            tenantId: row.tenant_id,
            customerType: row.customer_type,
            fullName: row.full_name,
            dateOfBirth: row.date_of_birth,
            nationality: row.nationality,
            countryOfResidence: row.country_of_residence,
            riskRating: row.risk_rating,
            kycStatus: row.kyc_status,
            verificationLevel: row.verification_level,
            pepStatus: row.pep_status,
            pepDetails: row.pep_details,
            sanctionsStatus: row.sanctions_status,
            sanctionsDetails: row.sanctions_details,
            adverseMedia: row.adverse_media,
            adverseMediaDetails: row.adverse_media_details,
            lastReviewDate: row.last_review_date,
            nextReviewDate: row.next_review_date,
            documents: [],
        };
    }
}
exports.FraudDetectionService = FraudDetectionService;
