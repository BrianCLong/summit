import { v4 as uuidv4 } from 'uuid';
import type {
  Transaction,
  Party,
  Account,
  ImportJob,
  ImportFormat,
  ImportLedgerInput,
} from '@intelgraph/finance-normalizer-types';
import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { parseData, type ParseResult, type ParsedRecord } from '../parsers/index.js';
import { logAudit } from '../middleware/audit.js';

/**
 * Normalization Service
 * Handles import jobs, transaction normalization, and entity creation
 */
export class NormalizationService {
  /**
   * Start a new import job
   */
  async startImportJob(
    input: ImportLedgerInput,
    tenantId: string,
    userId: string
  ): Promise<ImportJob> {
    const jobId = uuidv4();

    // Decode source data
    let sourceData: string | Buffer;
    let sourceUri: string;

    if (input.source.type === 'inline') {
      sourceData = Buffer.from(input.source.content, 'base64').toString('utf8');
      sourceUri = `inline:${input.source.filename || 'data'}`;
    } else {
      // For URI sources, we'd fetch the data here
      // For now, just record the URI
      sourceUri = input.source.uri;
      sourceData = ''; // Would be fetched
    }

    const job: ImportJob = {
      id: jobId,
      datasetRef: input.datasetRef,
      sourceUri,
      format: input.format,
      parserConfig: input.parserConfig || {},
      status: 'PENDING',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
      skippedCount: 0,
      errors: [],
      createdTransactionIds: [],
      createdPartyIds: [],
      createdAccountIds: [],
      initiatedBy: userId,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert job record
    await db.query(
      `INSERT INTO finance_import_jobs (
        id, dataset_ref, source_uri, format, parser_config, status,
        initiated_by, tenant_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        job.id,
        job.datasetRef,
        job.sourceUri,
        job.format,
        JSON.stringify(job.parserConfig),
        job.status,
        job.initiatedBy,
        job.tenantId,
        job.createdAt,
        job.updatedAt,
      ]
    );

    // Process asynchronously if not dry run
    if (!input.dryRun && input.source.type === 'inline') {
      this.processImportJob(job, sourceData, tenantId).catch((err) => {
        logger.error('Import job failed', { jobId, error: err.message });
      });
    } else if (input.dryRun && input.source.type === 'inline') {
      // For dry run, just parse and return validation results
      const result = await this.validateData(sourceData, input.format, input.parserConfig);
      job.status = result.errors.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';
      job.totalRecords = result.totalRecords;
      job.successCount = result.records.length;
      job.errorCount = result.errors.length;
      job.errors = result.errors.map((e) => ({
        ...e,
        severity: 'ERROR' as const,
      }));
    }

    await logAudit(
      tenantId,
      userId,
      'IMPORT_JOB_STARTED',
      'ImportJob',
      jobId,
      { datasetRef: input.datasetRef, format: input.format, dryRun: input.dryRun }
    );

    return job;
  }

  /**
   * Validate data without importing
   */
  async validateData(
    data: string | Buffer,
    format?: ImportFormat,
    config?: Record<string, unknown>
  ): Promise<ParseResult> {
    return parseData(data, format, config);
  }

  /**
   * Process an import job
   */
  private async processImportJob(
    job: ImportJob,
    data: string | Buffer,
    tenantId: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to parsing
      await this.updateJobStatus(job.id, 'PARSING');

      // Parse the data
      const parseResult = await parseData(data, job.format, job.parserConfig);

      job.totalRecords = parseResult.totalRecords;

      // Update status to normalizing
      await this.updateJobStatus(job.id, 'NORMALIZING', {
        totalRecords: parseResult.totalRecords,
      });

      // Process each record
      for (let i = 0; i < parseResult.records.length; i++) {
        const record = parseResult.records[i];

        try {
          const result = await this.normalizeAndStore(record, tenantId);

          job.processedRecords++;
          job.successCount++;

          if (result.transactionId) {
            job.createdTransactionIds.push(result.transactionId);
          }
          if (result.partyIds) {
            job.createdPartyIds.push(...result.partyIds);
          }
          if (result.accountIds) {
            job.createdAccountIds.push(...result.accountIds);
          }

          if (record.warnings.length > 0) {
            job.warningCount += record.warnings.length;
          }
        } catch (err) {
          job.errorCount++;
          job.errors.push({
            recordIndex: i,
            code: 'NORMALIZATION_ERROR',
            message: err instanceof Error ? err.message : 'Unknown error',
            severity: 'ERROR',
          });
        }

        // Update progress periodically
        if (i % 100 === 0) {
          await this.updateJobProgress(job);
        }
      }

      // Add parse errors
      job.errors.push(
        ...parseResult.errors.map((e) => ({
          ...e,
          severity: 'ERROR' as const,
        }))
      );
      job.errorCount += parseResult.errors.length;

      // Final status
      job.status = job.errorCount > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';
      job.completedAt = new Date().toISOString();
      job.durationMs = Date.now() - startTime;

      await this.updateJobProgress(job);

      logger.info('Import job completed', {
        jobId: job.id,
        totalRecords: job.totalRecords,
        successCount: job.successCount,
        errorCount: job.errorCount,
        durationMs: job.durationMs,
      });
    } catch (err) {
      job.status = 'FAILED';
      job.completedAt = new Date().toISOString();
      job.durationMs = Date.now() - startTime;
      job.errors.push({
        code: 'JOB_FAILED',
        message: err instanceof Error ? err.message : 'Unknown error',
        severity: 'ERROR',
        recordIndex: undefined,
      });

      await this.updateJobProgress(job);

      logger.error('Import job failed', {
        jobId: job.id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /**
   * Normalize a parsed record and store in database
   */
  private async normalizeAndStore(
    record: ParsedRecord,
    tenantId: string
  ): Promise<{
    transactionId?: string;
    partyIds?: string[];
    accountIds?: string[];
  }> {
    const result: {
      transactionId?: string;
      partyIds?: string[];
      accountIds?: string[];
    } = {};

    return db.transaction(async (client) => {
      // Store parties first
      if (record.parties && record.parties.length > 0) {
        result.partyIds = [];
        for (const party of record.parties) {
          const partyId = party.id || uuidv4();
          await client.query(
            `INSERT INTO finance_parties (
              id, canonical_name, original_name, type, aliases, identifiers,
              jurisdiction, risk_classification, is_pep, sanctions_match,
              metadata, provenance, tenant_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              canonical_name = EXCLUDED.canonical_name,
              updated_at = EXCLUDED.updated_at`,
            [
              partyId,
              party.canonicalName,
              party.originalName || party.canonicalName,
              party.type || 'UNKNOWN',
              JSON.stringify(party.aliases || []),
              JSON.stringify(party.identifiers || []),
              party.jurisdiction,
              party.riskClassification,
              party.isPep || false,
              party.sanctionsMatch || false,
              JSON.stringify(party.metadata || {}),
              JSON.stringify(party.provenance || {}),
              tenantId,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          result.partyIds.push(partyId);
        }
      }

      // Store accounts if present
      if (record.accounts && record.accounts.length > 0) {
        result.accountIds = [];
        for (const account of record.accounts) {
          const accountId = account.id || uuidv4();
          await client.query(
            `INSERT INTO finance_accounts (
              id, account_number, name, type, status, owner_id, institution_id,
              currency, iban, routing_number, bic, metadata, provenance,
              tenant_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              updated_at = EXCLUDED.updated_at`,
            [
              accountId,
              account.accountNumber,
              account.name,
              account.type || 'OTHER',
              account.status || 'ACTIVE',
              account.ownerId,
              account.institutionId,
              account.currency || 'USD',
              account.iban,
              account.routingNumber,
              account.bic,
              JSON.stringify(account.metadata || {}),
              JSON.stringify(account.provenance || {}),
              tenantId,
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );
          result.accountIds.push(accountId);
        }
      }

      // Store transaction
      if (record.transaction) {
        const txn = record.transaction;
        const txnId = txn.id || uuidv4();

        await client.query(
          `INSERT INTO finance_transactions (
            id, reference_number, external_id, type, status, direction,
            source_account_id, destination_account_id, originator_id, beneficiary_id,
            ordering_party_id, intermediary_id,
            amount_minor_units, amount_currency, amount_decimal_places,
            settlement_amount_minor_units, settlement_currency,
            exchange_rate, fees, total_fees_minor_units,
            value_date, posting_date, execution_date, settlement_date,
            description, remittance_info, purpose_code, category_code,
            reverses_transaction_id, running_balance_minor_units,
            instrument_id, quantity, unit_price_minor_units,
            raw_record, metadata, provenance, tenant_id, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
            $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
          )`,
          [
            txnId,
            txn.referenceNumber,
            txn.externalId,
            txn.type,
            txn.status,
            txn.direction,
            txn.sourceAccountId,
            txn.destinationAccountId,
            txn.originatorId,
            txn.beneficiaryId,
            txn.orderingPartyId,
            txn.intermediaryId,
            txn.amount?.minorUnits?.toString(),
            txn.amount?.currency,
            txn.amount?.decimalPlaces,
            txn.settlementAmount?.minorUnits?.toString(),
            txn.settlementAmount?.currency,
            txn.exchangeRate ? JSON.stringify(txn.exchangeRate) : null,
            JSON.stringify(txn.fees || []),
            txn.totalFees?.minorUnits?.toString(),
            txn.valueDate,
            txn.postingDate,
            txn.executionDate,
            txn.settlementDate,
            txn.description,
            txn.remittanceInfo,
            txn.purposeCode,
            txn.categoryCode,
            txn.reversesTransactionId,
            txn.runningBalance?.minorUnits?.toString(),
            txn.instrumentId,
            txn.quantity,
            txn.unitPrice?.minorUnits?.toString(),
            JSON.stringify(txn.rawRecord || {}),
            JSON.stringify(txn.metadata || {}),
            JSON.stringify(txn.provenance || {}),
            tenantId,
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );

        result.transactionId = txnId;
      }

      return result;
    });
  }

  /**
   * Get import job by ID
   */
  async getImportJob(jobId: string, tenantId: string): Promise<ImportJob | null> {
    const result = await db.query<any>(
      `SELECT * FROM finance_import_jobs WHERE id = $1 AND tenant_id = $2`,
      [jobId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapImportJobRow(row);
  }

  /**
   * List import jobs
   */
  async listImportJobs(
    tenantId: string,
    limit = 20,
    offset = 0
  ): Promise<{ jobs: ImportJob[]; total: number }> {
    const [jobsResult, countResult] = await Promise.all([
      db.query<any>(
        `SELECT * FROM finance_import_jobs
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM finance_import_jobs WHERE tenant_id = $1`,
        [tenantId]
      ),
    ]);

    return {
      jobs: jobsResult.rows.map(this.mapImportJobRow),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Normalize a single transaction (for streaming)
   */
  async normalizeTransaction(
    rawData: Record<string, unknown>,
    format: ImportFormat,
    config: Record<string, unknown> | undefined,
    tenantId: string
  ): Promise<Transaction> {
    const dataStr = JSON.stringify(rawData);
    const parseResult = await parseData(dataStr, format, config);

    if (parseResult.errors.length > 0) {
      throw new Error(`Parse errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    if (parseResult.records.length === 0) {
      throw new Error('No records parsed');
    }

    const record = parseResult.records[0];
    if (!record.transaction) {
      throw new Error('No transaction in parsed record');
    }

    // Store the normalized transaction
    const result = await this.normalizeAndStore(record, tenantId);

    return {
      ...record.transaction,
      id: result.transactionId || record.transaction.id || uuidv4(),
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Transaction;
  }

  // Helper methods

  private async updateJobStatus(
    jobId: string,
    status: ImportJob['status'],
    extra?: Record<string, unknown>
  ): Promise<void> {
    const updates = ['status = $2', 'updated_at = $3'];
    const params: unknown[] = [jobId, status, new Date().toISOString()];

    if (extra?.totalRecords !== undefined) {
      updates.push(`total_records = $${params.length + 1}`);
      params.push(extra.totalRecords);
    }

    await db.query(
      `UPDATE finance_import_jobs SET ${updates.join(', ')} WHERE id = $1`,
      params
    );
  }

  private async updateJobProgress(job: ImportJob): Promise<void> {
    await db.query(
      `UPDATE finance_import_jobs SET
        status = $2,
        total_records = $3,
        processed_records = $4,
        success_count = $5,
        error_count = $6,
        warning_count = $7,
        skipped_count = $8,
        errors = $9,
        created_transaction_ids = $10,
        created_party_ids = $11,
        created_account_ids = $12,
        completed_at = $13,
        duration_ms = $14,
        updated_at = $15
      WHERE id = $1`,
      [
        job.id,
        job.status,
        job.totalRecords,
        job.processedRecords,
        job.successCount,
        job.errorCount,
        job.warningCount,
        job.skippedCount,
        JSON.stringify(job.errors),
        JSON.stringify(job.createdTransactionIds),
        JSON.stringify(job.createdPartyIds),
        JSON.stringify(job.createdAccountIds),
        job.completedAt,
        job.durationMs,
        new Date().toISOString(),
      ]
    );
  }

  private mapImportJobRow(row: any): ImportJob {
    return {
      id: row.id,
      datasetRef: row.dataset_ref,
      sourceUri: row.source_uri,
      format: row.format,
      parserConfig: row.parser_config || {},
      status: row.status,
      totalRecords: row.total_records || 0,
      processedRecords: row.processed_records || 0,
      successCount: row.success_count || 0,
      errorCount: row.error_count || 0,
      warningCount: row.warning_count || 0,
      skippedCount: row.skipped_count || 0,
      errors: row.errors || [],
      createdTransactionIds: row.created_transaction_ids || [],
      createdPartyIds: row.created_party_ids || [],
      createdAccountIds: row.created_account_ids || [],
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      initiatedBy: row.initiated_by,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const normalizationService = new NormalizationService();
