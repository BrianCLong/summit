import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { Contract, PurchaseOrder } from './types.js';
import { randomUUID } from 'crypto';
import { provenanceLedger } from '../provenance/ledger.js';

export class ContractService {
  private static instance: ContractService;

  private constructor() { }

  public static getInstance(): ContractService {
    if (!ContractService.instance) {
      ContractService.instance = new ContractService();
    }
    return ContractService.instance;
  }

  // --- Purchase Orders ---

  async createPurchaseOrder(
    input: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
    actorId: string
  ): Promise<PurchaseOrder> {
    const pool = getPostgresPool();
    const id = randomUUID();
    const result = await pool.write(
      `INSERT INTO purchase_orders (
        id, tenant_id, po_number, issuer, issued_date, amount, currency, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)
      RETURNING *`,
      [id, input.tenantId, input.poNumber, input.issuer, input.issuedDate, input.amount, input.currency, input.metadata]
    );

    const po = this.mapPORow(result.rows[0]);

    await provenanceLedger.appendEntry({
      tenantId: input.tenantId,
      actionType: 'PO_CREATED',
      resourceType: 'PurchaseOrder',
      resourceId: id,
      actorId: actorId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'CREATE',
        entityId: id,
        entityType: 'PurchaseOrder',
        poNumber: input.poNumber,
        issuer: input.issuer
      },
      metadata: {
        poId: id,
        tenantId: input.tenantId,
        poNumber: input.poNumber
      }
    });

    return po;
  }

  async getPurchaseOrder(id: string, tenantId: string): Promise<PurchaseOrder | null> {
    const pool = getPostgresPool();
    const result = await pool.read(
      `SELECT * FROM purchase_orders WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rowCount === 0) return null;
    return this.mapPORow(result.rows[0]);
  }

  // --- Contracts ---

  async createContract(
    input: Omit<Contract, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
    actorId: string
  ): Promise<Contract> {
    const pool = getPostgresPool();
    const id = randomUUID();
    const result = await pool.write(
      `INSERT INTO contracts (
        id, tenant_id, title, status, start_date, end_date, auto_renew, metadata, purchase_order_id
      ) VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8)
      RETURNING *`,
      [id, input.tenantId, input.title, input.startDate, input.endDate, input.autoRenew, input.metadata, input.purchaseOrderId]
    );

    const contract = this.mapContractRow(result.rows[0]);

    await provenanceLedger.appendEntry({
      tenantId: input.tenantId,
      actionType: 'CONTRACT_CREATED',
      resourceType: 'Contract',
      resourceId: id,
      actorId: actorId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'CREATE',
        entityId: id,
        entityType: 'Contract',
        title: input.title
      },
      metadata: {
        contractId: id,
        tenantId: input.tenantId,
        title: input.title
      }
    });

    return contract;
  }

  async getContract(id: string, tenantId: string): Promise<Contract | null> {
    const pool = getPostgresPool();
    const result = await pool.read(
      `SELECT * FROM contracts WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rowCount === 0) return null;
    return this.mapContractRow(result.rows[0]);
  }

  private mapPORow(row: any): PurchaseOrder {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      poNumber: row.po_number,
      issuer: row.issuer,
      issuedDate: row.issued_date,
      amount: row.amount ? parseFloat(row.amount) : null,
      currency: row.currency,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapContractRow(row: any): Contract {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      autoRenew: row.auto_renew,
      metadata: row.metadata,
      purchaseOrderId: row.purchase_order_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const contractService = ContractService.getInstance();
