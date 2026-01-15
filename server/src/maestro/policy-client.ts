
export class PolicyClient {
  private static instance: PolicyClient;

  private constructor() {}

  static getInstance(): PolicyClient {
    if (!PolicyClient.instance) {
      PolicyClient.instance = new PolicyClient();
    }
    return PolicyClient.instance;
  }

  async evaluate(input: any): Promise<{ allowed: boolean; reason?: string }> {
    // In a real scenario, this would POST to OPA sidecar
    console.log('[PolicyClient] Evaluating:', JSON.stringify(input));

    // Simulate simple check
    if (!input.user || !input.user.tenantId) {
      return { allowed: false, reason: 'No user context' };
    }

    // Default allow for prototype if roles exist
    if (input.user.roles && input.user.roles.length > 0) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'No roles found' };
  }
}

export const policyClient = PolicyClient.getInstance();
