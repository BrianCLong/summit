"use strict";
/**
 * Regulatory Reporting Service
 *
 * Automated generation and submission of regulatory reports including:
 * - CAT (Consolidated Audit Trail)
 * - TRACE (Trade Reporting and Compliance Engine)
 * - Form PF (SEC Private Fund reporting)
 * - MiFID II Reports (RTS 25, 27, 28)
 * - SAR/CTR (Suspicious Activity / Currency Transaction Reports)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulatoryReportingService = void 0;
const crypto_1 = require("crypto");
const DEFAULT_CONFIG = {
    catSubmissionUrl: 'https://catnmsplan.com/api/submit',
    traceSubmissionUrl: 'https://finra.org/trace/submit',
    formPfSubmissionUrl: 'https://sec.gov/formpf/submit',
    firmId: 'FIRM001',
    reportingEntityId: 'RE001',
};
class RegulatoryReportingService {
    pg;
    config;
    constructor(pg, config) {
        this.pg = pg;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    // ============================================================================
    // CAT REPORTING
    // ============================================================================
    /**
     * Generate CAT report for a given date
     */
    async generateCATReport(tenantId, reportDate) {
        const reportId = (0, crypto_1.randomUUID)();
        // Get all orders and trades for the reporting period
        const events = await this.generateCATEvents(tenantId, reportDate);
        // Validate events
        const { errors, warnings } = this.validateCATEvents(events);
        const report = {
            reportId,
            tenantId,
            reportDate,
            firmId: this.config.firmId,
            events,
            status: errors.length > 0 ? 'rejected' : 'pending',
            errorCount: errors.length,
            warningCount: warnings.length,
        };
        // Store report
        await this.storeCATReport(report);
        return report;
    }
    /**
     * Generate CAT events from orders and trades
     */
    async generateCATEvents(tenantId, reportDate) {
        const events = [];
        // Get new orders (MENO - New Order)
        const { rows: newOrders } = await this.pg.query(`SELECT * FROM orders
       WHERE tenant_id = $1
         AND DATE(created_at) = DATE($2)
         AND parent_order_id IS NULL`, [tenantId, reportDate]);
        for (const order of newOrders) {
            events.push({
                eventId: (0, crypto_1.randomUUID)(),
                eventType: 'MENO',
                timestamp: order.created_at,
                symbol: order.symbol,
                orderType: order.order_type,
                side: order.side,
                quantity: parseFloat(order.quantity),
                price: order.price ? parseFloat(order.price) : undefined,
                accountHolderType: 'A', // A = Institution
                senderImid: this.config.firmId,
            });
        }
        // Get order modifications (MEOA - Order Amended)
        const { rows: modifiedOrders } = await this.pg.query(`SELECT * FROM order_modifications
       WHERE tenant_id = $1
         AND DATE(modified_at) = DATE($2)`, [tenantId, reportDate]);
        for (const mod of modifiedOrders) {
            events.push({
                eventId: (0, crypto_1.randomUUID)(),
                eventType: 'MEOA',
                timestamp: mod.modified_at,
                symbol: mod.symbol,
                quantity: mod.new_quantity ? parseFloat(mod.new_quantity) : undefined,
                price: mod.new_price ? parseFloat(mod.new_price) : undefined,
            });
        }
        // Get trades (MEOT - Trade)
        const { rows: trades } = await this.pg.query(`SELECT * FROM trades
       WHERE tenant_id = $1
         AND DATE(execution_time) = DATE($2)
         AND status = 'filled'`, [tenantId, reportDate]);
        for (const trade of trades) {
            events.push({
                eventId: (0, crypto_1.randomUUID)(),
                eventType: 'MEOT',
                timestamp: trade.execution_time,
                symbol: trade.symbol,
                side: trade.side,
                quantity: parseFloat(trade.quantity),
                price: parseFloat(trade.price),
                destination: trade.venue,
            });
        }
        // Get cancellations (MEMR - Order Cancelled)
        const { rows: cancellations } = await this.pg.query(`SELECT * FROM orders
       WHERE tenant_id = $1
         AND DATE(updated_at) = DATE($2)
         AND status = 'cancelled'`, [tenantId, reportDate]);
        for (const cancel of cancellations) {
            events.push({
                eventId: (0, crypto_1.randomUUID)(),
                eventType: 'MEMR',
                timestamp: cancel.updated_at,
                symbol: cancel.symbol,
            });
        }
        // Sort by timestamp
        events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return events;
    }
    /**
     * Validate CAT events
     */
    validateCATEvents(events) {
        const errors = [];
        const warnings = [];
        for (const event of events) {
            // Required field validation
            if (!event.eventType) {
                errors.push({
                    field: 'eventType',
                    errorCode: 'CAT001',
                    errorMessage: 'Event type is required',
                    severity: 'error',
                    recordReference: event.eventId,
                });
            }
            if (!event.timestamp) {
                errors.push({
                    field: 'timestamp',
                    errorCode: 'CAT002',
                    errorMessage: 'Timestamp is required',
                    severity: 'error',
                    recordReference: event.eventId,
                });
            }
            if (!event.symbol) {
                errors.push({
                    field: 'symbol',
                    errorCode: 'CAT003',
                    errorMessage: 'Symbol is required',
                    severity: 'error',
                    recordReference: event.eventId,
                });
            }
            // Event-specific validation
            if (event.eventType === 'MENO' || event.eventType === 'MEOT') {
                if (!event.side) {
                    errors.push({
                        field: 'side',
                        errorCode: 'CAT004',
                        errorMessage: 'Side is required for new orders and trades',
                        severity: 'error',
                        recordReference: event.eventId,
                    });
                }
                if (!event.quantity || event.quantity <= 0) {
                    errors.push({
                        field: 'quantity',
                        errorCode: 'CAT005',
                        errorMessage: 'Valid quantity is required',
                        severity: 'error',
                        recordReference: event.eventId,
                    });
                }
            }
            // Timestamp sequence validation
            if (event.timestamp > new Date()) {
                warnings.push({
                    field: 'timestamp',
                    errorCode: 'CAT006',
                    errorMessage: 'Timestamp is in the future',
                    severity: 'warning',
                    recordReference: event.eventId,
                });
            }
        }
        return { errors, warnings };
    }
    // ============================================================================
    // TRACE REPORTING
    // ============================================================================
    /**
     * Generate TRACE report for fixed income trades
     */
    async generateTRACEReport(tenantId, reportDate) {
        const reportId = (0, crypto_1.randomUUID)();
        // Get fixed income trades
        const { rows } = await this.pg.query(`SELECT t.*, s.cusip
       FROM trades t
       JOIN security_master s ON t.symbol = s.symbol
       WHERE t.tenant_id = $1
         AND DATE(t.execution_time) = DATE($2)
         AND t.status = 'filled'
         AND s.asset_class = 'fixed_income'`, [tenantId, reportDate]);
        const trades = rows.map((row) => ({
            tradeId: row.trade_id,
            cusip: row.cusip,
            executionTime: row.execution_time,
            quantity: parseFloat(row.quantity),
            price: parseFloat(row.price),
            yield: row.yield_value ? parseFloat(row.yield_value) : undefined,
            side: row.side,
            capacity: this.determineCapacity(row),
            contraPartyType: this.determineContraPartyType(row),
            reportingParty: row.side === 'buy' ? 'buyer' : 'seller',
            specialConditions: this.getSpecialConditions(row),
        }));
        // Validate trades
        const validationErrors = this.validateTRACETrades(trades);
        const report = {
            reportId,
            tenantId,
            reportDate,
            trades,
            status: validationErrors.length > 0 ? 'rejected' : 'pending',
        };
        await this.storeTRACEReport(report);
        return report;
    }
    determineCapacity(trade) {
        // Logic to determine if firm traded as principal or agent
        return trade.capacity || 'principal';
    }
    determineContraPartyType(trade) {
        const contraParty = trade.contra_party_type;
        if (contraParty === 'ATS')
            return 'ats';
        if (contraParty === 'BD')
            return 'broker_dealer';
        return 'customer';
    }
    getSpecialConditions(trade) {
        const conditions = [];
        if (trade.weighted_average)
            conditions.push('W');
        if (trade.when_issued)
            conditions.push('WI');
        if (trade.special_price)
            conditions.push('S');
        return conditions.length > 0 ? conditions : undefined;
    }
    validateTRACETrades(trades) {
        const errors = [];
        for (const trade of trades) {
            if (!trade.cusip || trade.cusip.length !== 9) {
                errors.push({
                    field: 'cusip',
                    errorCode: 'TRACE001',
                    errorMessage: 'Valid 9-character CUSIP is required',
                    severity: 'error',
                    recordReference: trade.tradeId,
                });
            }
            if (!trade.executionTime) {
                errors.push({
                    field: 'executionTime',
                    errorCode: 'TRACE002',
                    errorMessage: 'Execution time is required',
                    severity: 'error',
                    recordReference: trade.tradeId,
                });
            }
            if (!trade.quantity || trade.quantity <= 0) {
                errors.push({
                    field: 'quantity',
                    errorCode: 'TRACE003',
                    errorMessage: 'Valid quantity is required',
                    severity: 'error',
                    recordReference: trade.tradeId,
                });
            }
            if (!trade.price || trade.price <= 0) {
                errors.push({
                    field: 'price',
                    errorCode: 'TRACE004',
                    errorMessage: 'Valid price is required',
                    severity: 'error',
                    recordReference: trade.tradeId,
                });
            }
        }
        return errors;
    }
    // ============================================================================
    // FORM PF REPORTING
    // ============================================================================
    /**
     * Generate Form PF report for private funds
     */
    async generateFormPFReport(tenantId, reportingPeriod) {
        const reportId = (0, crypto_1.randomUUID)();
        // Gather required data
        const fundData = await this.gatherFormPFData(tenantId, reportingPeriod);
        // Generate report content
        const reportContent = this.formatFormPFContent(fundData);
        // Validate
        const validationErrors = this.validateFormPFData(fundData);
        const report = {
            reportId,
            tenantId,
            reportType: 'form_pf',
            reportingPeriod,
            status: validationErrors.length > 0 ? 'pending_review' : 'draft',
            submissionDeadline: this.calculateFormPFDeadline(reportingPeriod.end),
            generatedAt: new Date(),
            generatedBy: 'system',
            validationErrors,
            metadata: { fundData, reportContent },
        };
        await this.storeReport(report);
        return report;
    }
    async gatherFormPFData(tenantId, period) {
        // Question 1: Basic fund information
        const { rows: fundInfo } = await this.pg.query(`SELECT * FROM fund_info WHERE tenant_id = $1`, [tenantId]);
        // Question 2: AUM
        const { rows: aumData } = await this.pg.query(`SELECT
         SUM(nav) as total_aum,
         COUNT(DISTINCT fund_id) as fund_count
       FROM fund_nav
       WHERE tenant_id = $1
         AND valuation_date = $2`, [tenantId, period.end]);
        // Question 3: Borrowings
        const { rows: borrowings } = await this.pg.query(`SELECT
         borrowing_type,
         SUM(amount) as total_amount,
         AVG(interest_rate) as avg_rate
       FROM fund_borrowings
       WHERE tenant_id = $1
         AND as_of_date = $2
       GROUP BY borrowing_type`, [tenantId, period.end]);
        // Question 4: Derivatives exposure
        const { rows: derivatives } = await this.pg.query(`SELECT
         derivative_type,
         SUM(notional_value) as gross_notional,
         SUM(market_value) as net_exposure
       FROM derivative_positions
       WHERE tenant_id = $1
         AND position_date = $2
       GROUP BY derivative_type`, [tenantId, period.end]);
        // Question 5: Counterparty exposures
        const { rows: counterparties } = await this.pg.query(`SELECT
         counterparty_name,
         SUM(exposure_amount) as total_exposure
       FROM counterparty_exposures
       WHERE tenant_id = $1
         AND exposure_date = $2
       GROUP BY counterparty_name
       ORDER BY total_exposure DESC
       LIMIT 10`, [tenantId, period.end]);
        return {
            fundInfo: fundInfo[0] || {},
            totalAum: parseFloat(aumData[0]?.total_aum || '0'),
            fundCount: parseInt(aumData[0]?.fund_count || '0', 10),
            borrowings,
            derivatives,
            topCounterparties: counterparties,
            reportingPeriod: period,
        };
    }
    formatFormPFContent(data) {
        // Format data according to Form PF XML schema
        return {
            formVersion: '2.0',
            filerInfo: {
                name: data.fundInfo?.name || '',
                crd: data.fundInfo?.crd || '',
                lei: data.fundInfo?.lei || '',
            },
            section1: {
                totalAum: data.totalAum,
                fundCount: data.fundCount,
            },
            section2: {
                borrowings: data.borrowings,
            },
            section3: {
                derivatives: data.derivatives,
            },
            section4: {
                counterparties: data.topCounterparties,
            },
        };
    }
    validateFormPFData(data) {
        const errors = [];
        if (!data.totalAum || data.totalAum <= 0) {
            errors.push({
                field: 'totalAum',
                errorCode: 'FORMPF001',
                errorMessage: 'Total AUM must be greater than zero',
                severity: 'error',
            });
        }
        if (!data.fundCount || data.fundCount <= 0) {
            errors.push({
                field: 'fundCount',
                errorCode: 'FORMPF002',
                errorMessage: 'Fund count must be greater than zero',
                severity: 'error',
            });
        }
        return errors;
    }
    calculateFormPFDeadline(periodEnd) {
        // Form PF is due 60 days after quarter end for large advisers
        const deadline = new Date(periodEnd);
        deadline.setDate(deadline.getDate() + 60);
        return deadline;
    }
    // ============================================================================
    // MIFID II REPORTING
    // ============================================================================
    /**
     * Generate MiFID II RTS 28 report (Best Execution)
     */
    async generateMiFIDRTS28Report(tenantId, year) {
        const reportId = (0, crypto_1.randomUUID)();
        const periodStart = new Date(year, 0, 1);
        const periodEnd = new Date(year, 11, 31);
        // Get execution data by venue
        const { rows: venueData } = await this.pg.query(`SELECT
         venue,
         asset_class,
         COUNT(*) as order_count,
         SUM(quantity * price) as total_notional,
         AVG(vwap_slippage) as avg_slippage
       FROM trades t
       LEFT JOIN execution_quality eq ON t.trade_id = eq.trade_id
       WHERE t.tenant_id = $1
         AND t.execution_time >= $2
         AND t.execution_time <= $3
         AND t.status = 'filled'
       GROUP BY venue, asset_class
       ORDER BY total_notional DESC`, [tenantId, periodStart, periodEnd]);
        // Format RTS 28 tables
        const rts28Tables = this.formatRTS28Tables(venueData);
        const report = {
            reportId,
            tenantId,
            reportType: 'mifid_rts28',
            reportingPeriod: { start: periodStart, end: periodEnd },
            status: 'draft',
            submissionDeadline: new Date(year + 1, 3, 30), // April 30 of following year
            generatedAt: new Date(),
            generatedBy: 'system',
            metadata: { venueData, rts28Tables },
        };
        await this.storeReport(report);
        return report;
    }
    formatRTS28Tables(venueData) {
        // Group by asset class
        const byAssetClass = new Map();
        for (const row of venueData) {
            const assetClass = row.asset_class || 'other';
            if (!byAssetClass.has(assetClass)) {
                byAssetClass.set(assetClass, []);
            }
            byAssetClass.get(assetClass).push(row);
        }
        const tables = {};
        for (const [assetClass, venues] of byAssetClass) {
            // Take top 5 venues
            const top5 = venues.slice(0, 5);
            const totalNotional = venues.reduce((sum, v) => sum + parseFloat(v.total_notional || '0'), 0);
            tables[assetClass] = {
                topVenues: top5.map((v, index) => ({
                    rank: index + 1,
                    venue: v.venue,
                    percentOfOrders: ((parseInt(v.order_count || '0', 10) /
                        venues.reduce((s, x) => s + parseInt(x.order_count || '0', 10), 0)) *
                        100).toFixed(2),
                    percentOfVolume: ((parseFloat(v.total_notional || '0') / totalNotional) *
                        100).toFixed(2),
                })),
                qualitativeSummary: this.generateQualitativeSummary(assetClass),
            };
        }
        return tables;
    }
    generateQualitativeSummary(assetClass) {
        // Standard qualitative summary text
        return `For ${assetClass} instruments, the firm considers price, cost, speed, likelihood of execution, ` +
            `settlement probability, order size, market impact, and any other relevant considerations when ` +
            `selecting execution venues. The firm regularly monitors execution quality and reviews venue selection.`;
    }
    // ============================================================================
    // SAR/CTR REPORTING
    // ============================================================================
    /**
     * Generate Suspicious Activity Report (SAR)
     */
    async generateSARReport(tenantId, caseId, filedBy) {
        const reportId = (0, crypto_1.randomUUID)();
        // Get case details
        const { rows: caseRows } = await this.pg.query(`SELECT * FROM aml_cases WHERE case_id = $1 AND tenant_id = $2`, [caseId, tenantId]);
        if (caseRows.length === 0) {
            throw new Error('AML case not found');
        }
        const amlCase = caseRows[0];
        // Get subject details
        const { rows: subjectRows } = await this.pg.query(`SELECT * FROM kyc_profiles WHERE customer_id = $1 AND tenant_id = $2`, [amlCase.customer_id, tenantId]);
        const subject = subjectRows[0] || {};
        // Get transaction details
        const { rows: txRows } = await this.pg.query(`SELECT * FROM transactions
       WHERE transaction_id = ANY($1::text[])
       ORDER BY timestamp ASC`, [JSON.parse(amlCase.transactions || '[]')]);
        // Calculate total amount
        const totalAmount = txRows.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
        // Format SAR data
        const sarData = {
            filingInstitution: {
                name: this.config.firmId,
                ein: '', // Would come from config
                address: '', // Would come from config
            },
            subject: {
                type: subject.customer_type === 'individual' ? 'individual' : 'entity',
                name: subject.full_name,
                dateOfBirth: subject.date_of_birth,
                idNumber: subject.customer_id,
                address: '', // Would need to fetch
                occupation: '',
            },
            suspiciousActivity: {
                dateRange: {
                    start: txRows[0]?.timestamp || new Date(),
                    end: txRows[txRows.length - 1]?.timestamp || new Date(),
                },
                amount: totalAmount,
                activityTypes: this.determineActivityTypes(amlCase),
                narrativeSummary: amlCase.findings || '',
            },
            transactions: txRows.map((tx) => ({
                date: tx.timestamp,
                type: tx.type,
                amount: parseFloat(tx.amount),
                description: tx.description,
            })),
        };
        const report = {
            reportId,
            tenantId,
            reportType: 'sar',
            reportingPeriod: {
                start: sarData.suspiciousActivity.dateRange.start,
                end: sarData.suspiciousActivity.dateRange.end,
            },
            status: 'draft',
            submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            generatedAt: new Date(),
            generatedBy: filedBy,
            metadata: { sarData, caseId },
        };
        await this.storeReport(report);
        return report;
    }
    determineActivityTypes(amlCase) {
        const types = [];
        const riskLevel = amlCase.risk_level;
        // Map case findings to FinCEN activity types
        if (riskLevel === 'severe' || riskLevel === 'high') {
            types.push('Suspicious cash activity');
        }
        const findings = amlCase.findings || '';
        if (findings.toLowerCase().includes('structur')) {
            types.push('Structuring');
        }
        if (findings.toLowerCase().includes('launder')) {
            types.push('Money laundering');
        }
        if (findings.toLowerCase().includes('fraud')) {
            types.push('Fraud');
        }
        return types.length > 0 ? types : ['Other suspicious activity'];
    }
    /**
     * Generate Currency Transaction Report (CTR)
     */
    async generateCTRReport(tenantId, transactionId) {
        const reportId = (0, crypto_1.randomUUID)();
        // Get transaction details
        const { rows: txRows } = await this.pg.query(`SELECT t.*, k.*
       FROM transactions t
       JOIN kyc_profiles k ON t.customer_id = k.customer_id AND t.tenant_id = k.tenant_id
       WHERE t.transaction_id = $1 AND t.tenant_id = $2`, [transactionId, tenantId]);
        if (txRows.length === 0) {
            throw new Error('Transaction not found');
        }
        const tx = txRows[0];
        // Validate CTR threshold ($10,000)
        if (parseFloat(tx.amount) < 10000) {
            throw new Error('Transaction does not meet CTR threshold');
        }
        const ctrData = {
            transactionDate: tx.timestamp,
            transactionType: tx.type,
            amount: parseFloat(tx.amount),
            currency: tx.currency,
            conductor: {
                name: tx.full_name,
                dateOfBirth: tx.date_of_birth,
                idType: tx.id_type || 'Unknown',
                idNumber: tx.customer_id,
                address: '', // Would fetch from customer profile
            },
            filingInstitution: {
                name: this.config.firmId,
            },
        };
        const report = {
            reportId,
            tenantId,
            reportType: 'ctr',
            reportingPeriod: { start: tx.timestamp, end: tx.timestamp },
            status: 'draft',
            submissionDeadline: new Date(tx.timestamp.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
            generatedAt: new Date(),
            generatedBy: 'system',
            metadata: { ctrData, transactionId },
        };
        await this.storeReport(report);
        return report;
    }
    // ============================================================================
    // REPORT MANAGEMENT
    // ============================================================================
    /**
     * Get reports for a tenant
     */
    async getReports(tenantId, filters) {
        const conditions = ['tenant_id = $1'];
        const params = [tenantId];
        let paramIndex = 2;
        if (filters?.reportType?.length) {
            conditions.push(`report_type = ANY($${paramIndex})`);
            params.push(filters.reportType);
            paramIndex++;
        }
        if (filters?.status?.length) {
            conditions.push(`status = ANY($${paramIndex})`);
            params.push(filters.status);
            paramIndex++;
        }
        if (filters?.startDate) {
            conditions.push(`generated_at >= $${paramIndex}`);
            params.push(filters.startDate);
            paramIndex++;
        }
        if (filters?.endDate) {
            conditions.push(`generated_at <= $${paramIndex}`);
            params.push(filters.endDate);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        const countResult = await this.pg.query(`SELECT COUNT(*) FROM regulatory_reports WHERE ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        const { rows } = await this.pg.query(`SELECT * FROM regulatory_reports
       WHERE ${whereClause}
       ORDER BY generated_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset]);
        return {
            reports: rows.map(this.mapReportRow),
            total,
        };
    }
    /**
     * Update report status
     */
    async updateReportStatus(reportId, status, userId, notes) {
        const updates = ['status = $2', 'updated_at = NOW()'];
        const params = [reportId, status];
        let paramIndex = 3;
        if (status === 'approved') {
            updates.push(`approved_at = NOW()`);
            updates.push(`approved_by = $${paramIndex}`);
            params.push(userId);
            paramIndex++;
        }
        if (status === 'submitted') {
            updates.push(`submitted_at = NOW()`);
            updates.push(`submitted_by = $${paramIndex}`);
            params.push(userId);
            paramIndex++;
        }
        await this.pg.query(`UPDATE regulatory_reports SET ${updates.join(', ')} WHERE report_id = $1`, params);
    }
    /**
     * Submit report to regulator
     */
    async submitReport(reportId, userId) {
        // Get report
        const { rows } = await this.pg.query(`SELECT * FROM regulatory_reports WHERE report_id = $1`, [reportId]);
        if (rows.length === 0) {
            return { success: false, error: 'Report not found' };
        }
        const report = this.mapReportRow(rows[0]);
        // Verify report is approved
        if (report.status !== 'approved') {
            return { success: false, error: 'Report must be approved before submission' };
        }
        // In a real implementation, this would submit to the appropriate regulator API
        // For now, we'll simulate successful submission
        const regulatorReference = `${report.reportType.toUpperCase()}-${Date.now()}`;
        await this.pg.query(`UPDATE regulatory_reports
       SET status = 'submitted',
           submitted_at = NOW(),
           submitted_by = $2,
           regulator_reference = $3
       WHERE report_id = $1`, [reportId, userId, regulatorReference]);
        return { success: true, reference: regulatorReference };
    }
    // ============================================================================
    // STORAGE METHODS
    // ============================================================================
    async storeReport(report) {
        await this.pg.query(`INSERT INTO regulatory_reports (
        report_id, tenant_id, report_type, period_start, period_end, status,
        submission_deadline, generated_at, generated_by, validation_errors, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
            report.reportId,
            report.tenantId,
            report.reportType,
            report.reportingPeriod.start,
            report.reportingPeriod.end,
            report.status,
            report.submissionDeadline,
            report.generatedAt,
            report.generatedBy,
            JSON.stringify(report.validationErrors || []),
            JSON.stringify(report.metadata || {}),
        ]);
    }
    async storeCATReport(report) {
        await this.pg.query(`INSERT INTO cat_reports (
        report_id, tenant_id, report_date, firm_id, events, status,
        error_count, warning_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            report.reportId,
            report.tenantId,
            report.reportDate,
            report.firmId,
            JSON.stringify(report.events),
            report.status,
            report.errorCount,
            report.warningCount,
        ]);
    }
    async storeTRACEReport(report) {
        await this.pg.query(`INSERT INTO trace_reports (
        report_id, tenant_id, report_date, trades, status
      ) VALUES ($1, $2, $3, $4, $5)`, [
            report.reportId,
            report.tenantId,
            report.reportDate,
            JSON.stringify(report.trades),
            report.status,
        ]);
    }
    mapReportRow(row) {
        return {
            reportId: row.report_id,
            tenantId: row.tenant_id,
            reportType: row.report_type,
            reportingPeriod: {
                start: row.period_start,
                end: row.period_end,
            },
            status: row.status,
            submissionDeadline: row.submission_deadline,
            submittedAt: row.submitted_at,
            submittedBy: row.submitted_by,
            regulatorReference: row.regulator_reference,
            validationErrors: JSON.parse(row.validation_errors || '[]'),
            generatedAt: row.generated_at,
            generatedBy: row.generated_by,
            approvedAt: row.approved_at,
            approvedBy: row.approved_by,
            metadata: JSON.parse(row.metadata || '{}'),
        };
    }
}
exports.RegulatoryReportingService = RegulatoryReportingService;
