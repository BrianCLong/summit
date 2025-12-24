
export class TenantSentinel {
  private static enabled: boolean = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

  /**
   * Enforces that a tenantId is present and valid.
   * Throws an error if the check fails and the sentinel is enabled.
   */
  static assertTenant(contextOrParams: any, operationName: string = 'Unknown Operation'): void {
    if (!this.enabled) return;

    const tenantId = contextOrParams?.tenantId || contextOrParams?.tenant_id;

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      const error = new Error(`[TenantSentinel] Tenant Leak Detected! Operation '${operationName}' is missing a valid tenantId.`);
      // @ts-ignore
      error.code = 'TENANT_LEAK';
      throw error;
    }
  }

  /**
   * Validates that the returned data belongs to the requested tenant.
   * Useful for post-query checks.
   */
  static assertResult(result: any, expectedTenantId: string, operationName: string = 'Unknown Operation'): void {
    if (!this.enabled) return;
    if (!result) return; // Null/undefined results are usually fine (not found)

    const checkItem = (item: any) => {
      if (item && item.tenantId && item.tenantId !== expectedTenantId) {
         const error = new Error(`[TenantSentinel] Cross-Tenant Data Leak! Operation '${operationName}' returned data for tenant '${item.tenantId}' but expected '${expectedTenantId}'.`);
         // @ts-ignore
         error.code = 'DATA_LEAK';
         throw error;
      }
    }

    if (Array.isArray(result)) {
      result.forEach(checkItem);
    } else {
      checkItem(result);
    }
  }

  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}
