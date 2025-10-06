/* istanbul ignore file */
import type { MongoClient, ClientSession } from 'mongodb';
import { MongoClient as NativeMongoClient } from 'mongodb';
import type { AdapterFactoryOptions, DatabaseAdapter } from './base-adapter.js';

export interface MongoAdapterOptions extends AdapterFactoryOptions {
  readonly client?: MongoClient;
  readonly databaseName?: string;
}

export class MongoAdapter implements DatabaseAdapter<ClientSession> {
  public readonly dialect = 'mongodb';
  private readonly client: MongoClient;

  constructor(private readonly options: MongoAdapterOptions) {
    this.client = options.client ?? new NativeMongoClient(options.connectionString ?? 'mongodb://localhost:27017');
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async beginTransaction(): Promise<ClientSession> {
    const session = this.client.startSession();
    session.startTransaction();
    return session;
  }

  async commit(transaction: ClientSession): Promise<void> {
    await transaction.commitTransaction();
    await transaction.endSession();
  }

  async rollback(transaction: ClientSession): Promise<void> {
    try {
      await transaction.abortTransaction();
    } finally {
      await transaction.endSession();
    }
  }

  async runInTransaction<R>(callback: (transaction: ClientSession) => Promise<R>): Promise<R> {
    const session = await this.beginTransaction();
    try {
      const result = await callback(session);
      await this.commit(session);
      return result;
    } catch (error) {
      await this.rollback(session);
      throw error;
    }
  }
}
