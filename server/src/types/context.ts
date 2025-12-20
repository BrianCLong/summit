import { Driver } from 'neo4j-driver';
import { Pool } from 'pg';
import Redis from 'ioredis';

/**
 * Interface representing a user in the system context.
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing the GraphQL execution context.
 * Contains database connections, request information, and user context.
 */
export interface GraphQLContext {
  user?: User;
  neo4j: Driver;
  postgres: Pool;
  redis?: Redis;
  req: any;
  requestId: string;
  authzDecisions?: Array<{
    field: string;
    decision: boolean;
    reason?: string;
  }>;
}
