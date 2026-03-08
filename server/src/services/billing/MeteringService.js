"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meteringService = exports.MeteringService = void 0;
// @ts-nocheck
const pg_js_1 = require("../../db/pg.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const quota_manager_js_1 = __importDefault(require("../../lib/resources/quota-manager.js"));
const metrics_js_1 = require("../../utils/metrics.js");
class MeteringService {
    static instance;
    metrics;
    constructor() {
        this.metrics = new metrics_js_1.PrometheusMetrics('summit_billing');
        this.metrics.createCounter('billable_events_total', 'Total number of billable events recorded', ['kind', 'status']);
    }
    static getInstance() {
        if (!MeteringService.instance) {
            MeteringService.instance = new MeteringService();
        }
        return MeteringService.instance;
    }
    /**
     * Records a billable event idempotently and securely.
     */
    async recordUsage(event) {
        const quota = quota_manager_js_1.default.getQuotaForTenant(event.tenantId);
        // Future: Check quota here
        const client = await pg_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            const insertQuery = `
        INSERT INTO usage_events (
          tenant_id,
          kind,
          quantity,
          unit,
          occurred_at,
          idempotency_key,
          metadata,
          principal_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
            let eventId;
            try {
                const result = await client.query(insertQuery, [
                    event.tenantId,
                    event.eventType,
                    event.quantity,
                    event.unit,
                    event.timestamp,
                    event.idempotencyKey,
                    JSON.stringify(event.metadata || {}),
                    event.actorId || 'system'
                ]);
                eventId = result.rows[0].id;
            }
            catch (err) {
                if (err.code === '23505') { // Unique violation
                    await client.query('ROLLBACK');
                    this.metrics.incrementCounter('billable_events_total', { kind: event.eventType, status: 'duplicate' });
                    const existing = await pg_js_1.pool.query('SELECT id FROM usage_events WHERE tenant_id = $1 AND idempotency_key = $2', [event.tenantId, event.idempotencyKey]);
                    if (existing.rows.length > 0) {
                        return {
                            eventId: existing.rows[0].id,
                            status: 'duplicate',
                            timestamp: new Date(),
                        };
                    }
                    throw err;
                }
                throw err;
            }
            // Log to Provenance Ledger
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId: event.tenantId,
                actionType: 'BILLABLE_EVENT',
                resourceType: 'metering_record',
                resourceId: eventId,
                actorId: event.actorId || 'system',
                actorType: 'system',
                timestamp: new Date(),
                payload: {
                    mutationType: 'CREATE',
                    entityId: eventId,
                    entityType: 'BillableEvent',
                    originalEvent: event,
                    meteringId: eventId
                },
                metadata: {
                    purpose: 'billing_audit',
                    idempotencyKey: event.idempotencyKey
                }
            });
            await client.query('COMMIT');
            this.metrics.incrementCounter('billable_events_total', { kind: event.eventType, status: 'recorded' });
            return {
                eventId,
                status: 'recorded',
                timestamp: new Date()
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            this.metrics.incrementCounter('billable_events_total', { kind: event.eventType, status: 'error' });
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Records a batch of billable events.
     * Note: For efficiency, we might batch provenance writes or do them async,
     * but for "Auditable" requirement, we keep it strict for now.
     */
    async recordBatch(events) {
        const receipts = [];
        // Sequential for safety in this iteration, can optimize to parallel/bulk later
        for (const event of events) {
            try {
                const receipt = await this.recordUsage(event);
                receipts.push(receipt);
            }
            catch (e) {
                // Log error but continue? Or fail all?
                // "Metering pipeline... Is tenant-scoped and time-bounded... No double-counting"
                // We should probably best effort here or atomic batch.
                // Let's do best effort and return status for each.
                receipts.push({
                    eventId: 'error',
                    status: 'rejected',
                    timestamp: new Date(),
                    // error: e.message
                });
            }
        }
        return receipts;
    }
    async getUsagePreview(tenantId, start, end) {
        const query = `
      SELECT kind, unit, SUM(quantity) as total_quantity
      FROM usage_events
      WHERE tenant_id = $1
      AND occurred_at >= $2
      AND occurred_at <= $3
      GROUP BY kind, unit
    `;
        const result = await pg_js_1.pool.query(query, [tenantId, start, end]);
        const breakdown = {};
        let estimatedCost = 0;
        for (const row of result.rows) {
            const kind = row.kind;
            const qty = parseFloat(row.total_quantity);
            const unitCost = this.getUnitCost(kind);
            const cost = qty * unitCost;
            breakdown[kind] = {
                quantity: qty,
                unit: row.unit,
                cost: cost
            };
            estimatedCost += cost;
        }
        return {
            tenantId,
            periodStart: start,
            periodEnd: end,
            totalCost: estimatedCost,
            breakdown
        };
    }
    getUnitCost(kind) {
        switch (kind) {
            case 'planning_run': return 0.10;
            case 'read_query': return 0.001;
            case 'write_action': return 0.05;
            case 'token': return 0.00002;
            default: return 0;
        }
    }
}
exports.MeteringService = MeteringService;
exports.meteringService = MeteringService.getInstance();
