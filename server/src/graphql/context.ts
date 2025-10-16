/**
 * GraphQL Context Interface
 * Shared context for all resolvers including v0.4.0 transcendent operations
 */

import { PubSub } from 'graphql-subscriptions';

export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
  tenantId?: string;
}

export interface Context {
  user?: User;
  req?: any;
  res?: any;
  pubsub?: PubSub;
  tenant?: string;

  // v0.4.0 Transcendent Intelligence context
  transcendentMode?: {
    enabled: boolean;
    safetyLevel: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
    humanOversightRequired: boolean;
  };

  // Authentication and authorization
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;

  // Audit and logging
  auditLog: (event: string, data: any) => void;

  // Feature flags
  features?: {
    transcendentIntelligence?: boolean;
    quantumCognition?: boolean;
    evolutionSandbox?: boolean;
    postQuantumSecurity?: boolean;
  };
}

export default Context;
