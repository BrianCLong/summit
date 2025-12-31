/**
 * OIDC-SCIM Reference Adapter
 * Identity provisioning adapter that bridges OIDC identities to SCIM directories
 *
 * ✅ SCAFFOLD ELIMINATED: Replaced stub implementation with real SCIM API client
 */

import { AdapterDefinition, AdapterRequest, AdapterResponse } from '@intelgraph/adapter-sdk';

/**
 * SCIM user representation (simplified)
 */
interface ScimUser {
  schemas: string[];
  id?: string;
  externalId?: string;
  userName: string;
  name?: {
    givenName?: string;
    familyName?: string;
    formatted?: string;
  };
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  active?: boolean;
}

/**
 * SCIM API client for user provisioning
 */
class ScimClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.token = token;
  }

  /**
   * Create or update a SCIM user (upsert)
   */
  async provisionUser(userId: string, userProfile: any): Promise<ScimUser> {
    const scimUser: ScimUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: userProfile.email || userId,
      externalId: userId,
      name: {
        givenName: userProfile.firstName,
        familyName: userProfile.lastName,
        formatted: `${userProfile.firstName} ${userProfile.lastName}`,
      },
      emails: [
        {
          value: userProfile.email,
          type: 'work',
          primary: true,
        },
      ],
      active: userProfile.active !== false,
    };

    // Try to find existing user first
    const existingUser = await this.findUserByExternalId(userId);

    if (existingUser) {
      // Update existing user
      return this.updateUser(existingUser.id!, scimUser);
    } else {
      // Create new user
      return this.createUser(scimUser);
    }
  }

  /**
   * Find user by externalId
   */
  private async findUserByExternalId(externalId: string): Promise<ScimUser | null> {
    const filter = `externalId eq "${externalId}"`;
    const url = `${this.baseUrl}/Users?filter=${encodeURIComponent(filter)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/scim+json',
        'Accept': 'application/scim+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(
        `SCIM user search failed (${response.status}): ${errorText}`
      );
    }

    const result = await response.json();
    if (result.Resources && result.Resources.length > 0) {
      return result.Resources[0];
    }

    return null;
  }

  /**
   * Create a new SCIM user
   */
  private async createUser(user: ScimUser): Promise<ScimUser> {
    const url = `${this.baseUrl}/Users`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/scim+json',
        'Accept': 'application/scim+json',
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SCIM user creation failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Update an existing SCIM user
   */
  private async updateUser(id: string, user: ScimUser): Promise<ScimUser> {
    const url = `${this.baseUrl}/Users/${id}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/scim+json',
        'Accept': 'application/scim+json',
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SCIM user update failed (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Deactivate a SCIM user (soft delete)
   */
  async deactivateUser(userId: string): Promise<void> {
    const existingUser = await this.findUserByExternalId(userId);

    if (!existingUser) {
      console.warn(`[SCIM] User ${userId} not found, already deprovisioned`);
      return;
    }

    const url = `${this.baseUrl}/Users/${existingUser.id}`;

    // PATCH to set active=false
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/scim+json',
        'Accept': 'application/scim+json',
      },
      body: JSON.stringify({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          {
            op: 'replace',
            path: 'active',
            value: false,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SCIM user deactivation failed (${response.status}): ${errorText}`
      );
    }
  }

  /**
   * Delete a SCIM user (hard delete)
   */
  async deleteUser(userId: string): Promise<void> {
    const existingUser = await this.findUserByExternalId(userId);

    if (!existingUser) {
      console.warn(`[SCIM] User ${userId} not found, already deleted`);
      return;
    }

    const url = `${this.baseUrl}/Users/${existingUser.id}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/scim+json',
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(
        `SCIM user deletion failed (${response.status}): ${errorText}`
      );
    }
  }
}

/**
 * Feature gate for SCIM adapter
 */
const SCIM_ADAPTER_ENABLED = process.env.ENABLE_SCIM_ADAPTER === 'true';

/**
 * Get SCIM configuration from environment
 */
function getScimConfig(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.SCIM_BASE_URL;
  const token = process.env.SCIM_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  return { baseUrl, token };
}

export const definition: AdapterDefinition = {
  name: 'reference-oidc-scim',
  version: '0.1.0',
  capabilities: ['identity'],
  requiredPermissions: ['adapter:identity:sync'],
  claims: ['oidc', 'scim'],
  lifecycle: {
    run: async (
      request: AdapterRequest<{
        userId: string;
        action: 'provision' | 'deprovision';
        userProfile?: any;
        mode?: 'soft' | 'hard';
      }>,
    ): Promise<AdapterResponse<{ success: boolean; scimUser?: ScimUser }>> => {
      const startTime = Date.now();

      // ✅ SECURITY FIX: Replaced stub with real implementation and feature gating

      // Feature gate check
      if (!SCIM_ADAPTER_ENABLED) {
        throw new Error(
          'SCIM adapter is not enabled. Set ENABLE_SCIM_ADAPTER=true to use this adapter. ' +
          'This is a reference implementation that requires proper SCIM endpoint configuration.'
        );
      }

      // Configuration check
      const config = getScimConfig();
      if (!config) {
        throw new Error(
          'SCIM adapter configuration missing. Required environment variables: ' +
          'SCIM_BASE_URL (e.g., https://directory.example.com/scim/v2), ' +
          'SCIM_TOKEN (bearer token for SCIM API authentication)'
        );
      }

      // Validate request
      if (!request.data.userId) {
        throw new Error('Missing required parameter: userId');
      }

      if (!request.data.action) {
        throw new Error('Missing required parameter: action (provision or deprovision)');
      }

      const client = new ScimClient(config.baseUrl, config.token);

      try {
        let scimUser: ScimUser | undefined;

        if (request.data.action === 'provision') {
          // Provision user
          if (!request.data.userProfile) {
            throw new Error('Missing required parameter for provisioning: userProfile');
          }

          console.log(
            `[SCIM] Provisioning user ${request.data.userId} to ${config.baseUrl}`
          );

          scimUser = await client.provisionUser(
            request.data.userId,
            request.data.userProfile
          );

          console.log(
            `[SCIM] Successfully provisioned user ${request.data.userId} ` +
            `(SCIM ID: ${scimUser.id})`
          );
        } else if (request.data.action === 'deprovision') {
          // Deprovision user
          const mode = request.data.mode || 'soft';

          console.log(
            `[SCIM] Deprovisioning user ${request.data.userId} ` +
            `from ${config.baseUrl} (mode: ${mode})`
          );

          if (mode === 'hard') {
            await client.deleteUser(request.data.userId);
          } else {
            await client.deactivateUser(request.data.userId);
          }

          console.log(
            `[SCIM] Successfully deprovisioned user ${request.data.userId}`
          );
        } else {
          throw new Error(
            `Invalid action: ${request.data.action}. ` +
            `Must be 'provision' or 'deprovision'`
          );
        }

        const durationMs = Date.now() - startTime;

        return {
          result: {
            success: true,
            scimUser,
          },
          durationMs,
          retries: 0,
        };
      } catch (error) {
        console.error(
          `[SCIM] Adapter error for user ${request.data.userId}:`,
          error
        );

        throw new Error(
          `SCIM adapter failed for ${request.data.action} of user ${request.data.userId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
  },
};
