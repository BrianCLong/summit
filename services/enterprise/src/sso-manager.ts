/**
 * Enterprise SSO/SCIM Management System
 * Sprint 27H: Single Sign-On and automated user provisioning
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc' | 'ldap';
  configuration: {
    entityId?: string;
    ssoURL?: string;
    x509Certificate?: string;
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    discoveryURL?: string;
    redirectURI?: string;
    scope?: string[];
    claims?: Record<string, string>;
  };
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups: string;
    department?: string;
    title?: string;
  };
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SCIMConfiguration {
  id: string;
  tenantId: string;
  endpoint: string;
  bearerToken: string;
  version: '1.1' | '2.0';
  supportedOperations: {
    users: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    groups: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
  };
  attributeMapping: {
    userName: string;
    email: string;
    givenName: string;
    familyName: string;
    displayName: string;
    department?: string;
    title?: string;
    groups?: string;
  };
  isActive: boolean;
  lastSync: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvisioningEvent {
  id: string;
  type:
    | 'user_created'
    | 'user_updated'
    | 'user_deleted'
    | 'group_created'
    | 'group_updated'
    | 'group_deleted';
  tenantId: string;
  userId?: string;
  groupId?: string;
  changes: Record<string, any>;
  source: 'sso' | 'scim' | 'manual';
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

export interface User {
  id: string;
  externalId?: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department?: string;
  title?: string;
  groups: string[];
  tenantId: string;
  source: 'sso' | 'scim' | 'manual';
  lastLogin?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  externalId?: string;
  name: string;
  displayName: string;
  description?: string;
  members: string[];
  tenantId: string;
  source: 'sso' | 'scim' | 'manual';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SSOManager extends EventEmitter {
  private providers = new Map<string, SSOProvider>();
  private scimConfigs = new Map<string, SCIMConfiguration>();
  private users = new Map<string, User>();
  private groups = new Map<string, Group>();
  private provisioningEvents = new Map<string, ProvisioningEvent>();

  constructor() {
    super();
  }

  /**
   * Configure SSO provider
   */
  async configureSSOProvider(
    provider: Omit<SSOProvider, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SSOProvider> {
    const fullProvider: SSOProvider = {
      ...provider,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate configuration based on provider type
    await this.validateSSOConfiguration(fullProvider);

    this.providers.set(fullProvider.id, fullProvider);
    this.emit('sso_provider_configured', fullProvider);

    return fullProvider;
  }

  /**
   * Configure SCIM endpoint
   */
  async configureSCIM(
    config: Omit<
      SCIMConfiguration,
      'id' | 'createdAt' | 'updatedAt' | 'lastSync'
    >,
  ): Promise<SCIMConfiguration> {
    const fullConfig: SCIMConfiguration = {
      ...config,
      id: crypto.randomUUID(),
      lastSync: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate SCIM endpoint
    await this.validateSCIMEndpoint(fullConfig);

    this.scimConfigs.set(fullConfig.id, fullConfig);
    this.emit('scim_configured', fullConfig);

    return fullConfig;
  }

  /**
   * Handle SSO authentication response
   */
  async handleSSOAuthentication(
    providerId: string,
    authResponse: any,
  ): Promise<{
    user: User;
    token: string;
    refreshToken?: string;
  }> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.isActive) {
      throw new Error('SSO provider not found or inactive');
    }

    // Parse authentication response based on provider type
    const userAttributes = await this.parseAuthResponse(provider, authResponse);

    // Map attributes to user object
    const user = await this.mapAttributesToUser(provider, userAttributes);

    // Create or update user
    const existingUser = Array.from(this.users.values()).find(
      (u) => u.email === user.email && u.tenantId === user.tenantId,
    );

    let finalUser: User;
    if (existingUser) {
      finalUser = await this.updateUser(existingUser.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        department: user.department,
        title: user.title,
        groups: user.groups,
        lastLogin: new Date(),
      });
    } else {
      finalUser = await this.createUser(user);
    }

    // Generate JWT token
    const token = this.generateAccessToken(finalUser);
    const refreshToken = this.generateRefreshToken(finalUser);

    this.emit('sso_authentication_success', {
      user: finalUser,
      provider: provider.name,
      timestamp: new Date(),
    });

    return {
      user: finalUser,
      token,
      refreshToken,
    };
  }

  /**
   * Handle SCIM provisioning requests
   */
  async handleSCIMRequest(
    tenantId: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    resourceType: 'Users' | 'Groups',
    resourceId?: string,
    body?: any,
  ): Promise<any> {
    const config = Array.from(this.scimConfigs.values()).find(
      (c) => c.tenantId === tenantId && c.isActive,
    );
    if (!config) {
      throw new Error('SCIM not configured for tenant');
    }

    switch (method) {
      case 'GET':
        return this.handleSCIMGet(config, resourceType, resourceId);
      case 'POST':
        return this.handleSCIMCreate(config, resourceType, body);
      case 'PUT':
      case 'PATCH':
        return this.handleSCIMUpdate(
          config,
          resourceType,
          resourceId!,
          body,
          method === 'PATCH',
        );
      case 'DELETE':
        return this.handleSCIMDelete(config, resourceType, resourceId!);
      default:
        throw new Error(`Unsupported SCIM method: ${method}`);
    }
  }

  /**
   * Sync users and groups from SCIM provider
   */
  async syncFromSCIM(configId: string): Promise<{
    usersProcessed: number;
    groupsProcessed: number;
    errors: string[];
  }> {
    const config = this.scimConfigs.get(configId);
    if (!config || !config.isActive) {
      throw new Error('SCIM configuration not found or inactive');
    }

    const errors: string[] = [];
    let usersProcessed = 0;
    let groupsProcessed = 0;

    try {
      // Sync users
      if (config.supportedOperations.users.read) {
        const users = await this.fetchSCIMUsers(config);
        for (const scimUser of users) {
          try {
            await this.processSCIMUser(config, scimUser);
            usersProcessed++;
          } catch (error) {
            errors.push(`User sync error: ${error.message}`);
          }
        }
      }

      // Sync groups
      if (config.supportedOperations.groups.read) {
        const groups = await this.fetchSCIMGroups(config);
        for (const scimGroup of groups) {
          try {
            await this.processSCIMGroup(config, scimGroup);
            groupsProcessed++;
          } catch (error) {
            errors.push(`Group sync error: ${error.message}`);
          }
        }
      }

      // Update last sync time
      config.lastSync = new Date();
      this.scimConfigs.set(configId, config);

      this.emit('scim_sync_completed', {
        configId,
        usersProcessed,
        groupsProcessed,
        errors,
      });
    } catch (error) {
      errors.push(`Sync failed: ${error.message}`);
    }

    return { usersProcessed, groupsProcessed, errors };
  }

  /**
   * Create user (internal or via provisioning)
   */
  async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<User> {
    const user: User = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);

    // Record provisioning event
    await this.recordProvisioningEvent({
      type: 'user_created',
      tenantId: user.tenantId,
      userId: user.id,
      changes: user,
      source: user.source,
    });

    this.emit('user_created', user);

    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);

    // Record provisioning event
    await this.recordProvisioningEvent({
      type: 'user_updated',
      tenantId: user.tenantId,
      userId: user.id,
      changes: updates,
      source: 'manual', // Will be overridden by calling context
    });

    this.emit('user_updated', updatedUser);

    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Soft delete by deactivating
    user.isActive = false;
    user.updatedAt = new Date();

    this.users.set(userId, user);

    // Record provisioning event
    await this.recordProvisioningEvent({
      type: 'user_deleted',
      tenantId: user.tenantId,
      userId: user.id,
      changes: { isActive: false },
      source: 'manual',
    });

    this.emit('user_deleted', user);
  }

  /**
   * Get SSO configuration for tenant
   */
  getSSOProviders(tenantId: string): SSOProvider[] {
    return Array.from(this.providers.values()).filter(
      (p) => p.tenantId === tenantId,
    );
  }

  /**
   * Get SCIM configuration for tenant
   */
  getSCIMConfiguration(tenantId: string): SCIMConfiguration | null {
    return (
      Array.from(this.scimConfigs.values()).find(
        (c) => c.tenantId === tenantId,
      ) || null
    );
  }

  /**
   * Get provisioning audit trail
   */
  getProvisioningAudit(tenantId: string, limit = 100): ProvisioningEvent[] {
    return Array.from(this.provisioningEvents.values())
      .filter((e) => e.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private async validateSSOConfiguration(provider: SSOProvider): Promise<void> {
    switch (provider.type) {
      case 'saml':
        if (
          !provider.configuration.entityId ||
          !provider.configuration.ssoURL
        ) {
          throw new Error('SAML provider requires entityId and ssoURL');
        }
        break;
      case 'oidc':
        if (
          !provider.configuration.clientId ||
          !provider.configuration.discoveryURL
        ) {
          throw new Error('OIDC provider requires clientId and discoveryURL');
        }
        break;
      case 'ldap':
        // LDAP validation would go here
        break;
    }
  }

  private async validateSCIMEndpoint(config: SCIMConfiguration): Promise<void> {
    // Test SCIM endpoint connectivity
    try {
      const response = await fetch(`${config.endpoint}/ServiceProviderConfig`, {
        headers: {
          Authorization: `Bearer ${config.bearerToken}`,
          'Content-Type': 'application/scim+json',
        },
      });

      if (!response.ok) {
        throw new Error(`SCIM endpoint validation failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`SCIM endpoint unreachable: ${error.message}`);
    }
  }

  private async parseAuthResponse(
    provider: SSOProvider,
    authResponse: any,
  ): Promise<Record<string, any>> {
    // Implementation would parse SAML assertions, OIDC tokens, etc.
    // For now, return mock parsed attributes
    return {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      groups: ['users', 'developers'],
    };
  }

  private async mapAttributesToUser(
    provider: SSOProvider,
    attributes: Record<string, any>,
  ): Promise<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> {
    const mapping = provider.attributeMapping;

    return {
      externalId: attributes.sub || attributes.id,
      email: attributes[mapping.email],
      firstName: attributes[mapping.firstName],
      lastName: attributes[mapping.lastName],
      displayName: `${attributes[mapping.firstName]} ${attributes[mapping.lastName]}`,
      department: mapping.department
        ? attributes[mapping.department]
        : undefined,
      title: mapping.title ? attributes[mapping.title] : undefined,
      groups: attributes[mapping.groups] || [],
      tenantId: provider.tenantId,
      source: 'sso',
      isActive: true,
    };
  }

  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        groups: user.groups,
        type: 'access',
      },
      process.env.JWT_SECRET || 'default-secret',
      {
        expiresIn: '1h',
        issuer: 'intelgraph',
        audience: 'intelgraph-api',
      },
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
      {
        expiresIn: '30d',
        issuer: 'intelgraph',
        audience: 'intelgraph-api',
      },
    );
  }

  private async handleSCIMGet(
    config: SCIMConfiguration,
    resourceType: string,
    resourceId?: string,
  ): Promise<any> {
    if (resourceType === 'Users') {
      if (resourceId) {
        const user = Array.from(this.users.values()).find(
          (u) => u.id === resourceId || u.externalId === resourceId,
        );
        return user ? this.formatSCIMUser(config, user) : null;
      } else {
        const users = Array.from(this.users.values()).filter(
          (u) => u.tenantId === config.tenantId,
        );
        return {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
          totalResults: users.length,
          Resources: users.map((user) => this.formatSCIMUser(config, user)),
        };
      }
    } else if (resourceType === 'Groups') {
      if (resourceId) {
        const group = Array.from(this.groups.values()).find(
          (g) => g.id === resourceId || g.externalId === resourceId,
        );
        return group ? this.formatSCIMGroup(config, group) : null;
      } else {
        const groups = Array.from(this.groups.values()).filter(
          (g) => g.tenantId === config.tenantId,
        );
        return {
          schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
          totalResults: groups.length,
          Resources: groups.map((group) => this.formatSCIMGroup(config, group)),
        };
      }
    }

    throw new Error(`Unsupported resource type: ${resourceType}`);
  }

  private async handleSCIMCreate(
    config: SCIMConfiguration,
    resourceType: string,
    body: any,
  ): Promise<any> {
    if (resourceType === 'Users') {
      const user = await this.createUserFromSCIM(config, body);
      return this.formatSCIMUser(config, user);
    } else if (resourceType === 'Groups') {
      const group = await this.createGroupFromSCIM(config, body);
      return this.formatSCIMGroup(config, group);
    }

    throw new Error(`Unsupported resource type: ${resourceType}`);
  }

  private async handleSCIMUpdate(
    config: SCIMConfiguration,
    resourceType: string,
    resourceId: string,
    body: any,
    isPatch: boolean,
  ): Promise<any> {
    // Implementation for SCIM updates
    throw new Error('SCIM update not implemented');
  }

  private async handleSCIMDelete(
    config: SCIMConfiguration,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    if (resourceType === 'Users') {
      await this.deleteUser(resourceId);
    } else if (resourceType === 'Groups') {
      // Implementation for group deletion
    }
  }

  private async fetchSCIMUsers(config: SCIMConfiguration): Promise<any[]> {
    // Implementation to fetch users from external SCIM provider
    return [];
  }

  private async fetchSCIMGroups(config: SCIMConfiguration): Promise<any[]> {
    // Implementation to fetch groups from external SCIM provider
    return [];
  }

  private async processSCIMUser(
    config: SCIMConfiguration,
    scimUser: any,
  ): Promise<void> {
    // Implementation to process and sync SCIM user
  }

  private async processSCIMGroup(
    config: SCIMConfiguration,
    scimGroup: any,
  ): Promise<void> {
    // Implementation to process and sync SCIM group
  }

  private async createUserFromSCIM(
    config: SCIMConfiguration,
    scimUser: any,
  ): Promise<User> {
    const mapping = config.attributeMapping;

    return this.createUser({
      externalId: scimUser.id,
      email: scimUser[mapping.email] || scimUser.emails?.[0]?.value,
      firstName: scimUser[mapping.givenName] || scimUser.name?.givenName,
      lastName: scimUser[mapping.familyName] || scimUser.name?.familyName,
      displayName: scimUser[mapping.displayName] || scimUser.displayName,
      department: mapping.department ? scimUser[mapping.department] : undefined,
      title: mapping.title ? scimUser[mapping.title] : undefined,
      groups: [],
      tenantId: config.tenantId,
      source: 'scim',
      isActive: scimUser.active !== false,
    });
  }

  private async createGroupFromSCIM(
    config: SCIMConfiguration,
    scimGroup: any,
  ): Promise<Group> {
    const group: Group = {
      id: crypto.randomUUID(),
      externalId: scimGroup.id,
      name: scimGroup.displayName,
      displayName: scimGroup.displayName,
      description: scimGroup.description,
      members: scimGroup.members?.map((m: any) => m.value) || [],
      tenantId: config.tenantId,
      source: 'scim',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.groups.set(group.id, group);
    return group;
  }

  private formatSCIMUser(config: SCIMConfiguration, user: User): any {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.externalId || user.id,
      userName: user.email,
      name: {
        givenName: user.firstName,
        familyName: user.lastName,
      },
      displayName: user.displayName,
      emails: [
        {
          value: user.email,
          primary: true,
        },
      ],
      active: user.isActive,
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
        lastModified: user.updatedAt.toISOString(),
      },
    };
  }

  private formatSCIMGroup(config: SCIMConfiguration, group: Group): any {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: group.externalId || group.id,
      displayName: group.displayName,
      members: group.members.map((memberId) => ({
        value: memberId,
        $ref: `Users/${memberId}`,
      })),
      meta: {
        resourceType: 'Group',
        created: group.createdAt.toISOString(),
        lastModified: group.updatedAt.toISOString(),
      },
    };
  }

  private async recordProvisioningEvent(
    event: Omit<ProvisioningEvent, 'id' | 'timestamp' | 'status'>,
  ): Promise<void> {
    const provisioningEvent: ProvisioningEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      status: 'completed',
    };

    this.provisioningEvents.set(provisioningEvent.id, provisioningEvent);
    this.emit('provisioning_event', provisioningEvent);
  }
}
