/**
 * AWS DynamoDB Provider
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand,
  TransactWriteItemsCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { IDatabaseProvider } from './index';
import {
  CloudProvider,
  DatabaseItem,
  DatabaseQueryOptions,
  DatabaseQueryResult,
  DatabaseWriteOptions,
  DatabaseError
} from '../types';

export class AWSDatabaseProvider implements IDatabaseProvider {
  readonly provider = CloudProvider.AWS;
  private client: DynamoDBClient;

  constructor(region?: string) {
    this.client = new DynamoDBClient({
      region: region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  async get<T = DatabaseItem>(
    table: string,
    key: Record<string, any>
  ): Promise<T | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: table,
          Key: marshall(key)
        })
      );

      if (!response.Item) return null;
      return unmarshall(response.Item) as T;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get item from DynamoDB: ${table}`,
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
      const params: any = {
        TableName: table,
        Item: marshall(item, { removeUndefinedValues: true })
      };

      if (!options?.upsert) {
        // Condition to prevent overwriting existing items
        const keyNames = Object.keys(item).slice(0, 1);
        params.ConditionExpression = `attribute_not_exists(${keyNames[0]})`;
      }

      await this.client.send(new PutItemCommand(params));
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new DatabaseError(
          `Item already exists in DynamoDB: ${table}`,
          this.provider,
          error
        );
      }
      throw new DatabaseError(
        `Failed to put item to DynamoDB: ${table}`,
        this.provider,
        error
      );
    }
  }

  async delete(table: string, key: Record<string, any>): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: table,
          Key: marshall(key)
        })
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete item from DynamoDB: ${table}`,
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
      const keyConditions = Object.entries(conditions);
      const expressionNames: Record<string, string> = {};
      const expressionValues: Record<string, any> = {};
      const conditionParts: string[] = [];

      keyConditions.forEach(([key, value], index) => {
        expressionNames[`#k${index}`] = key;
        expressionValues[`:v${index}`] = value;
        conditionParts.push(`#k${index} = :v${index}`);
      });

      const response = await this.client.send(
        new QueryCommand({
          TableName: table,
          KeyConditionExpression: conditionParts.join(' AND '),
          ExpressionAttributeNames: expressionNames,
          ExpressionAttributeValues: marshall(expressionValues),
          Limit: options?.limit,
          ExclusiveStartKey: options?.continuationToken
            ? JSON.parse(options.continuationToken)
            : undefined
        })
      );

      const items = (response.Items || []).map(
        (item) => unmarshall(item) as T
      );

      return {
        items,
        count: response.Count || 0,
        continuationToken: response.LastEvaluatedKey
          ? JSON.stringify(response.LastEvaluatedKey)
          : undefined
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to query DynamoDB: ${table}`,
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
      const response = await this.client.send(
        new ScanCommand({
          TableName: table,
          Limit: options?.limit,
          ExclusiveStartKey: options?.continuationToken
            ? JSON.parse(options.continuationToken)
            : undefined
        })
      );

      const items = (response.Items || []).map(
        (item) => unmarshall(item) as T
      );

      return {
        items,
        count: response.Count || 0,
        continuationToken: response.LastEvaluatedKey
          ? JSON.stringify(response.LastEvaluatedKey)
          : undefined
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to scan DynamoDB: ${table}`,
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
      const response = await this.client.send(
        new BatchGetItemCommand({
          RequestItems: {
            [table]: {
              Keys: keys.map((key) => marshall(key))
            }
          }
        })
      );

      const items = response.Responses?.[table] || [];
      return items.map((item) => unmarshall(item) as T);
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch get from DynamoDB: ${table}`,
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
      const requests: any[] = [];

      items.put?.forEach((item) => {
        requests.push({
          PutRequest: {
            Item: marshall(item, { removeUndefinedValues: true })
          }
        });
      });

      items.delete?.forEach((key) => {
        requests.push({
          DeleteRequest: {
            Key: marshall(key)
          }
        });
      });

      // DynamoDB batch write limit is 25 items
      for (let i = 0; i < requests.length; i += 25) {
        const batch = requests.slice(i, i + 25);
        await this.client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [table]: batch
            }
          })
        );
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch write to DynamoDB: ${table}`,
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
      const transactItems = operations.map((op) => {
        switch (op.type) {
          case 'put':
            return {
              Put: {
                TableName: op.table,
                Item: marshall(op.item!, { removeUndefinedValues: true })
              }
            };
          case 'delete':
            return {
              Delete: {
                TableName: op.table,
                Key: marshall(op.key!)
              }
            };
          case 'update':
            const updateExpressions: string[] = [];
            const expressionNames: Record<string, string> = {};
            const expressionValues: Record<string, any> = {};

            Object.entries(op.update || {}).forEach(([key, value], index) => {
              expressionNames[`#u${index}`] = key;
              expressionValues[`:u${index}`] = value;
              updateExpressions.push(`#u${index} = :u${index}`);
            });

            return {
              Update: {
                TableName: op.table,
                Key: marshall(op.key!),
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionNames,
                ExpressionAttributeValues: marshall(expressionValues)
              }
            };
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
      });

      await this.client.send(
        new TransactWriteItemsCommand({
          TransactItems: transactItems
        })
      );
    } catch (error) {
      throw new DatabaseError(
        'Failed to execute transaction in DynamoDB',
        this.provider,
        error as Error
      );
    }
  }
}
