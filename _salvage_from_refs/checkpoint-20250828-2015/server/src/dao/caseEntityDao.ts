import { encryptField, decryptField, Encrypted } from '../crypto/envelope';
import { Kms } from '../crypto/kms';
import { LocalKms } from '../crypto/localKms';
import { withTenant } from '../db/pg';

// Use a single KMS instance for the DAO
// In a real application, this would be instantiated based on environment (e.g., AwsKms, VaultKms)
const kms: Kms = new LocalKms();

// A simplified representation of the CaseEntity for insertion/update
export interface CaseEntityData {
  id?: string;
  email?: string;
  // ... other non-PII fields
}

/**
 * Inserts a new entity into the case_entity table, encrypting the email field.
 * @param tenantId The tenant owning the data.
 * @param entity The entity data to insert.
 */
export async function insertEntity(tenantId: string, entity: CaseEntityData): Promise<void> {
  return withTenant(tenantId, async (db) => {
    let encryptedEmail: Encrypted | null = null;
    if (entity.email) {
      // The key alias can be structured to provide context, e.g., for different data types or tenants
      const keyAlias = `tenant/${tenantId}/pii`;
      encryptedEmail = await encryptField(kms, keyAlias, Buffer.from(entity.email, 'utf8'));
    }

    const query = `
      INSERT INTO case_entity (
        tenant_id, 
        pii_email_cipher, pii_email_iv, pii_email_tag, pii_email_kid, pii_email_dek
        // ... other fields
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      tenantId,
      encryptedEmail?.ciphertext,
      encryptedEmail?.iv,
      encryptedEmail?.tag,
      encryptedEmail?.keyId,
      encryptedEmail?.dekWrapped
    ];

    await db.query(query, values);
  });
}

/**
 * Retrieves and decrypts the email for a given entity.
 * @param tenantId The tenant owning the data.
 * @param entityId The ID of the entity to retrieve.
 * @returns The decrypted email address, or null if not found or not set.
 */
export async function getEntityEmail(tenantId: string, entityId: string): Promise<string | null> {
  return withTenant(tenantId, async (db) => {
    const query = `
      SELECT pii_email_cipher, pii_email_iv, pii_email_tag, pii_email_kid, pii_email_dek 
      FROM case_entity 
      WHERE id = $1 AND tenant_id = $2
    `;
    
    const res = await db.query(query, [entityId, tenantId]);
    const row = res.rows[0];

    if (!row || !row.pii_email_cipher) {
      return null;
    }

    const encrypted: Encrypted = {
      ciphertext: row.pii_email_cipher,
      iv: row.pii_email_iv,
      tag: row.pii_email_tag,
      keyId: row.pii_email_kid,
      dekWrapped: row.pii_email_dek
    };

    const plain = await decryptField(kms, encrypted);
    return plain.toString('utf8');
  });
}
