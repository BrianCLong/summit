/**
 * Azure Cosmos DB Provider
 */

import { CosmosClient, Container, Database } from '@azure/cosmos';
import { IDatabaseProvider } from './index';
import {
  CloudProvider,
  DatabaseItem,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  DatabaseWriteOptions,
  DatabaseError
} from '../types';

export class AzureDatabaseProvider implements IDatabaseProvider {
  readonly provider = CloudProvider.AZURE;
  private client: CosmosClient;
  private databaseId: string;

  constructor(endpoint?: string, key?: string, databaseId?: string) {
    this.client = new CosmosClient({
      endpoint: endpoint || process.env.AZURE_COSMOS_ENDPOINT!,
      key: key || process.env.AZURE_COSMOS_KEY!
    });
    this.databaseId = databaseId || process.env.AZURE_COSMOS_DATABASE || 'summit';
  }

  private getContainer(table: string): Container {
    return this.client.database(this.databaseId).container(table);
  }

  async get<T = DatabaseItem>(
    table: string,
    key: Record<string, any>
  ): Promise<T | null> {
    try {
      const container = this.getContainer(table);
      const { id, partitionKey } = this.extractKeys(key);

      const { resource } = await container.item(id, partitionKey).read<T>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw new DatabaseError(
        `Failed to get item from Cosmos DB: ${table}`,
        this.provider,
        error
      );
    }
  }

  async put(
    table: string,
    item: DatabaseItem,
    options?: DatabaseWriteOptions
  ): Promise<void> {
    try {
      const container = this.getContainer(table);

      if (options?.upsert) {
        await container.items.upsert(item);
      } else {
        await container.items.create(item);
      }
    } catch (error: any) {
      if (error.code === 409) {
        throw new DatabaseError(
          `Item already exists in Cosmos DB: ${table}`,
          this.provider,
          error
        );
      }
      throw new DatabaseError(
        `Failed to put item to Cosmos DB: ${table}`,
        this.provider,
        error
      );
    }
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    try {
      const container = this.getContainer(table);
      const { id, partitionKey } = this.extractKeys(key);

      await container.item(id, partitionKey).delete();
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete item from Cosmos DB: ${table}`,
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
      const container = this.getContainer(table);

      const whereClauses = Object.entries(conditions).map(
        ([key, value], index) => `c.${key} = @p${index}`
      );
      const parameters = Object.entries(conditions).map(
        ([key, value], index) => ({
          name: `@p${index}`,
          value
        })
      );

      const querySpec = {
        query: `SELECT * FROM c WHERE ${whereClauses.join(' AND ')}`,
        parameters
      };

      const { resources, continuationToken } = await container.items
        .query<T>(querySpec, {
          maxItemCount: options?.limit,
          continuationToken: options?.continuationToken
        })
        .fetchNext();

      return {
        items: resources,
        count: resources.length,
        continuationToken
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to query Cosmos DB: ${table}`,
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
      const container = this.getContainer(table);

      const { resources, continuationToken } = await container.items
        .query<T>('SELECT * FROM c', {
          maxItemCount: options?.limit,
          continuationToken: options?.continuationToken
        })
        .fetchNext();

      return {
        items: resources,
        count: resources.length,
        continuationToken
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to scan Cosmos DB: ${table}`,
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
      const results = await Promise.all(
        keys.map((key) => this.get<T>(table, key))
      );
      return results.filter((item): item is T => item !== null);
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch get from Cosmos DB: ${table}`,
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
      const container = this.getContainer(table);
      const operations: any[] = [];

      items.put?.forEach((item) => {
        operations.push({
          operationType: 'Upsert',
          resourceBody: item
        });
      });

      items.delete?.forEach((key) => {
        const { id, partitionKey } = this.extractKeys(key);
        operations.push({
          operationType: 'Delete',
          id,
          partitionKey
        });
      });

      // Execute operations in batches of 100
      for (let i = 0; i < operations.length; i += 100) {
        const batch = operations.slice(i, i + 100);
        await container.items.bulk(batch);
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch write to Cosmos DB: ${table}`,
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
      // Group operations by partition key for transactional batch
      const table = operations[0].table;
      const container = this.getContainer(table);

      const batchOperations = operations.map((op) => {
        switch (op.type) {
          case 'put':
            return {
              operationType: 'Upsert' as const,
              resourceBody: op.item!
            };
          case 'delete':
            return {
              operationType: 'Delete' as const,
              id: op.key!.id
            };
          case 'update':
            return {
              operationType: 'Patch' as const,
              id: op.key!.id,
              resourceBody: {
                operations: Object.entries(op.update || {}).map(([key, value]) => ({
                  op: 'set',
                  path: `/${key}`,
                  value
                }))
              }
            };
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
      });

      await container.items.batch(batchOperations);
    } catch (error) {
      throw new DatabaseError(
        'Failed to execute transaction in Cosmos DB',
        this.provider,
        error as Error
      );
    }
  }

  private extractKeys(key: Record<string, any>): { id: string; partitionKey: any } {
    const { id, partitionKey, ...rest } = key;
    return {
      id: id || Object.values(rest)[0],
      partitionKey: partitionKey || Object.values(rest)[0]
    };
  }
}
