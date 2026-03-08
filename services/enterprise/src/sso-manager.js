"use strict";
/**
 * Enterprise SSO/SCIM Management System
 * Sprint 27H: Single Sign-On and automated user provisioning
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOManager = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class SSOManager extends events_1.EventEmitter {
    providers = new Map();
    scimConfigs = new Map();
    users = new Map();
    groups = new Map();
    provisioningEvents = new Map();
    constructor() {
        super();
    }
    /**
     * Configure SSO provider
     */
    async configureSSOProvider(provider) {
        const fullProvider = {
            ...provider,
            id: crypto_1.default.randomUUID(),
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
    async configureSCIM(config) {
        const fullConfig = {
            ...config,
            id: crypto_1.default.randomUUID(),
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
    async handleSSOAuthentication(providerId, authResponse) {
        const provider = this.providers.get(providerId);
        if (!provider || !provider.isActive) {
            throw new Error('SSO provider not found or inactive');
        }
        // Parse authentication response based on provider type
        const userAttributes = await this.parseAuthResponse(provider, authResponse);
        // Map attributes to user object
        const user = await this.mapAttributesToUser(provider, userAttributes);
        // Create or update user
        const existingUser = Array.from(this.users.values()).find((u) => u.email === user.email && u.tenantId === user.tenantId);
        let finalUser;
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
        }
        else {
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
    async handleSCIMRequest(tenantId, method, resourceType, resourceId, body) {
        const config = Array.from(this.scimConfigs.values()).find((c) => c.tenantId === tenantId && c.isActive);
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
                return this.handleSCIMUpdate(config, resourceType, resourceId, body, method === 'PATCH');
            case 'DELETE':
                return this.handleSCIMDelete(config, resourceType, resourceId);
            default:
                throw new Error(`Unsupported SCIM method: ${method}`);
        }
    }
    /**
     * Sync users and groups from SCIM provider
     */
    async syncFromSCIM(configId) {
        const config = this.scimConfigs.get(configId);
        if (!config || !config.isActive) {
            throw new Error('SCIM configuration not found or inactive');
        }
        const errors = [];
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
                    }
                    catch (error) {
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
                    }
                    catch (error) {
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
        }
        catch (error) {
            errors.push(`Sync failed: ${error.message}`);
        }
        return { usersProcessed, groupsProcessed, errors };
    }
    /**
     * Create user (internal or via provisioning)
     */
    async createUser(userData) {
        const user = {
            ...userData,
            id: crypto_1.default.randomUUID(),
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
    async updateUser(userId, updates) {
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
    async deleteUser(userId) {
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
    getSSOProviders(tenantId) {
        return Array.from(this.providers.values()).filter((p) => p.tenantId === tenantId);
    }
    /**
     * Get SCIM configuration for tenant
     */
    getSCIMConfiguration(tenantId) {
        return (Array.from(this.scimConfigs.values()).find((c) => c.tenantId === tenantId) || null);
    }
    /**
     * Get provisioning audit trail
     */
    getProvisioningAudit(tenantId, limit = 100) {
        return Array.from(this.provisioningEvents.values())
            .filter((e) => e.tenantId === tenantId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    async validateSSOConfiguration(provider) {
        switch (provider.type) {
            case 'saml':
                if (!provider.configuration.entityId ||
                    !provider.configuration.ssoURL) {
                    throw new Error('SAML provider requires entityId and ssoURL');
                }
                break;
            case 'oidc':
                if (!provider.configuration.clientId ||
                    !provider.configuration.discoveryURL) {
                    throw new Error('OIDC provider requires clientId and discoveryURL');
                }
                break;
            case 'ldap':
                // LDAP validation would go here
                break;
        }
    }
    async validateSCIMEndpoint(config) {
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
        }
        catch (error) {
            throw new Error(`SCIM endpoint unreachable: ${error.message}`);
        }
    }
    async parseAuthResponse(provider, authResponse) {
        // Implementation would parse SAML assertions, OIDC tokens, etc.
        // For now, return mock parsed attributes
        return {
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            groups: ['users', 'developers'],
        };
    }
    async mapAttributesToUser(provider, attributes) {
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
    generateAccessToken(user) {
        return jsonwebtoken_1.default.sign({
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
            groups: user.groups,
            type: 'access',
        }, process.env.JWT_SECRET || 'default-secret', {
            expiresIn: '1h',
            issuer: 'intelgraph',
            audience: 'intelgraph-api',
        });
    }
    generateRefreshToken(user) {
        return jsonwebtoken_1.default.sign({
            sub: user.id,
            type: 'refresh',
        }, process.env.JWT_REFRESH_SECRET || 'default-refresh-secret', {
            expiresIn: '30d',
            issuer: 'intelgraph',
            audience: 'intelgraph-api',
        });
    }
    async handleSCIMGet(config, resourceType, resourceId) {
        if (resourceType === 'Users') {
            if (resourceId) {
                const user = Array.from(this.users.values()).find((u) => u.id === resourceId || u.externalId === resourceId);
                return user ? this.formatSCIMUser(config, user) : null;
            }
            else {
                const users = Array.from(this.users.values()).filter((u) => u.tenantId === config.tenantId);
                return {
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
                    totalResults: users.length,
                    Resources: users.map((user) => this.formatSCIMUser(config, user)),
                };
            }
        }
        else if (resourceType === 'Groups') {
            if (resourceId) {
                const group = Array.from(this.groups.values()).find((g) => g.id === resourceId || g.externalId === resourceId);
                return group ? this.formatSCIMGroup(config, group) : null;
            }
            else {
                const groups = Array.from(this.groups.values()).filter((g) => g.tenantId === config.tenantId);
                return {
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
                    totalResults: groups.length,
                    Resources: groups.map((group) => this.formatSCIMGroup(config, group)),
                };
            }
        }
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
    async handleSCIMCreate(config, resourceType, body) {
        if (resourceType === 'Users') {
            const user = await this.createUserFromSCIM(config, body);
            return this.formatSCIMUser(config, user);
        }
        else if (resourceType === 'Groups') {
            const group = await this.createGroupFromSCIM(config, body);
            return this.formatSCIMGroup(config, group);
        }
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
    async handleSCIMUpdate(config, resourceType, resourceId, body, isPatch) {
        // Implementation for SCIM updates
        throw new Error('SCIM update not implemented');
    }
    async handleSCIMDelete(config, resourceType, resourceId) {
        if (resourceType === 'Users') {
            await this.deleteUser(resourceId);
        }
        else if (resourceType === 'Groups') {
            // Implementation for group deletion
        }
    }
    async fetchSCIMUsers(config) {
        // Implementation to fetch users from external SCIM provider
        return [];
    }
    async fetchSCIMGroups(config) {
        // Implementation to fetch groups from external SCIM provider
        return [];
    }
    async processSCIMUser(config, scimUser) {
        // Implementation to process and sync SCIM user
    }
    async processSCIMGroup(config, scimGroup) {
        // Implementation to process and sync SCIM group
    }
    async createUserFromSCIM(config, scimUser) {
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
    async createGroupFromSCIM(config, scimGroup) {
        const group = {
            id: crypto_1.default.randomUUID(),
            externalId: scimGroup.id,
            name: scimGroup.displayName,
            displayName: scimGroup.displayName,
            description: scimGroup.description,
            members: scimGroup.members?.map((m) => m.value) || [],
            tenantId: config.tenantId,
            source: 'scim',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.groups.set(group.id, group);
        return group;
    }
    formatSCIMUser(config, user) {
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
    formatSCIMGroup(config, group) {
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
    async recordProvisioningEvent(event) {
        const provisioningEvent = {
            ...event,
            id: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            status: 'completed',
        };
        this.provisioningEvents.set(provisioningEvent.id, provisioningEvent);
        this.emit('provisioning_event', provisioningEvent);
    }
}
exports.SSOManager = SSOManager;
