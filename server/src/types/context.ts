import { Pool } from 'pg';
import Redis from 'ioredis';

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

export interface GraphQLContext {
  user?: User;
  neo4j: any;
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
