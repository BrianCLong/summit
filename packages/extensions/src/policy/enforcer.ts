/**
 * Policy Enforcer
 *
 * Enforces permission-based access control for extensions via OPA.
 */

import { ExtensionPermission } from '../types.js';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
}

export class PolicyEnforcer {
  private opaUrl: string;

  constructor(opaUrl: string = 'http://localhost:8181') {
    this.opaUrl = opaUrl;
  }

  /**
   * Check if an extension is allowed to use requested permissions
   */
  async checkPermissions(
    extensionName: string,
    permissions: ExtensionPermission[]
  ): Promise<boolean> {
    // If no OPA service, allow by default (dev mode)
    if (!this.isOPAAvailable()) {
      console.warn(
        `OPA not available, allowing extension ${extensionName} by default (dev mode)`
      );
      return true;
    }

    try {
      const decision = await this.queryOPA({
        input: {
          extension: extensionName,
          permissions,
          context: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (!decision.result?.allowed) {
        console.warn(
          `Extension ${extensionName} denied by policy:`,
          decision.result?.reason || 'No reason provided'
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error(`Policy check failed for ${extensionName}:`, err);
      // Fail closed - deny on error
      return false;
    }
  }

  /**
   * Check if a specific action is allowed for an extension
   */
  async checkAction(
    extensionName: string,
    action: string,
    resource?: string
  ): Promise<boolean> {
    if (!this.isOPAAvailable()) {
      return true;
    }

    try {
      const decision = await this.queryOPA({
        input: {
          extension: extensionName,
          action,
          resource,
          context: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return decision.result?.allowed ?? false;
    } catch (err) {
      console.error(`Action check failed for ${extensionName}:`, err);
      return false;
    }
  }

  /**
   * Query OPA policy engine
   */
  private async queryOPA(input: any): Promise<any> {
    const response = await fetch(`${this.opaUrl}/v1/data/summit/extensions/allow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`OPA query failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if OPA is available
   */
  private isOPAAvailable(): boolean {
    // In production, this should actually check connectivity
    // For now, check if OPA_URL is configured
    return process.env.OPA_URL !== undefined || this.opaUrl !== 'http://localhost:8181';
  }

  /**
   * Load extension policy into OPA
   */
  async loadPolicy(policyRego: string): Promise<void> {
    const response = await fetch(`${this.opaUrl}/v1/policies/summit-extensions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: policyRego,
    });

    if (!response.ok) {
      throw new Error(`Failed to load policy: ${response.statusText}`);
    }
  }

  /**
   * Get current policy
   */
  async getPolicy(): Promise<string> {
    const response = await fetch(`${this.opaUrl}/v1/policies/summit-extensions`);

    if (!response.ok) {
      throw new Error(`Failed to get policy: ${response.statusText}`);
    }

    const data = (await response.json()) as { result?: { raw?: string } };
    return data.result?.raw || '';
  }
}
