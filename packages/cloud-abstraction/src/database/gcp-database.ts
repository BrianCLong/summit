/**
 * GCP Firestore Provider
 */

import { Firestore, FieldPath, Transaction } from '@google-cloud/firestore';
import { IDatabaseProvider } from './index';
import {
  CloudProvider,
  DatabaseItem,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  DatabaseWriteOptions,
  DatabaseError
} from '../types';

export class GCPDatabaseProvider implements IDatabaseProvider {
  readonly provider = CloudProvider.GCP;
  private firestore: Firestore;

  constructor(projectId?: string, keyFilename?: string) {
    this.firestore = new Firestore({
      projectId: projectId || process.env.GCP_PROJECT_ID,
      keyFilename: keyFilename || process.env.GCP_KEY_FILENAME
    });
  }

  async get<T = DatabaseItem>(
    table: string,
    key: Record<string, any>
  ): Promise<T | null> {
    try {
      const docId = this.getDocumentId(key);
      const doc = await this.firestore.collection(table).doc(docId).get();

      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get item from Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async put(
    table: string,
    item: DatabaseItem,
    options?: DatabaseWriteOptions
  ): Promise<void> {
    try {
      const { id, ...data } = item;
      const docRef = this.firestore.collection(table).doc(id || this.generateId());

      if (options?.upsert) {
        await docRef.set(data, { merge: true });
      } else {
        const existing = await docRef.get();
        if (existing.exists) {
          throw new DatabaseError(
            `Item already exists in Firestore: ${table}`,
            this.provider
          );
        }
        await docRef.set(data);
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to put item to Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    try {
      const docId = this.getDocumentId(key);
      await this.firestore.collection(table).doc(docId).delete();
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete item from Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async query<T = DatabaseItem>(
    table: string,
    conditions: Record<string, any>,
    options?: DatabaseQueryOptions
  ): Promise<DatabaseQueryResult<T>> {
    try {
      let query: FirebaseFirestore.Query = this.firestore.collection(table);

      Object.entries(conditions).forEach(([field, value]) => {
        query = query.where(field, '==', value);
      });

      if (options?.orderBy) {
        query = query.orderBy(
          options.orderBy,
          options.orderDirection || 'asc'
        );
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.continuationToken) {
        const lastDoc = await this.firestore
          .collection(table)
          .doc(options.continuationToken)
          .get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as T)
      );

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      return {
        items,
        count: items.length,
        continuationToken: lastDoc?.id
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to query Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async scan<T = DatabaseItem>(
    table: string,
    options?: DatabaseQueryOptions
  ): Promise<DatabaseQueryResult<T>> {
    try {
      let query: FirebaseFirestore.Query = this.firestore.collection(table);

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.continuationToken) {
        const lastDoc = await this.firestore
          .collection(table)
          .doc(options.continuationToken)
          .get();
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const items = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as T)
      );

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      return {
        items,
        count: items.length,
        continuationToken: lastDoc?.id
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to scan Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async batchGet<T = DatabaseItem>(
    table: string,
    keys: Record<string, any>[]
  ): Promise<T[]> {
    try {
      const refs = keys.map((key) =>
        this.firestore.collection(table).doc(this.getDocumentId(key))
      );

      const snapshots = await this.firestore.getAll(...refs);
      return snapshots
        .filter((doc) => doc.exists)
        .map((doc) => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch get from Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async batchWrite(
    table: string,
    items: { put?: DatabaseItem[]; delete?: Record<string, any>[] }
  ): Promise<void> {
    try {
      const batch = this.firestore.batch();

      items.put?.forEach((item) => {
        const { id, ...data } = item;
        const ref = this.firestore
          .collection(table)
          .doc(id || this.generateId());
        batch.set(ref, data, { merge: true });
      });

      items.delete?.forEach((key) => {
        const ref = this.firestore
          .collection(table)
          .doc(this.getDocumentId(key));
        batch.delete(ref);
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch write to Firestore: ${table}`,
        this.provider,
        error as Error
      );
    }
  }

  async transaction(
    operations: Array<{
      type: 'put' | 'delete' | 'update';
      table: string;
      item?: DatabaseItem;
      key?: Record<string, any>;
      update?: Record<string, any>;
    }>
  ): Promise<void> {
    try {
      await this.firestore.runTransaction(async (transaction) => {
        for (const op of operations) {
          const ref = this.firestore
            .collection(op.table)
            .doc(
              op.type === 'put'
                ? op.item?.id || this.generateId()
                : this.getDocumentId(op.key!)
            );

          switch (op.type) {
            case 'put':
              const { id, ...data } = op.item!;
              transaction.set(ref, data, { merge: true });
              break;
            case 'delete':
              transaction.delete(ref);
              break;
            case 'update':
              transaction.update(ref, op.update!);
              break;
          }
        }
      });
    } catch (error) {
      throw new DatabaseError(
        'Failed to execute transaction in Firestore',
        this.provider,
        error as Error
      );
    }
  }

  private getDocumentId(key: Record<string, any>): string {
    return key.id || Object.values(key)[0];
  }

  private generateId(): string {
    return this.firestore.collection('_').doc().id;
  }
}
