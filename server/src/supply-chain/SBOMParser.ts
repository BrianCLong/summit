import { Component, SBOM } from './types';
import { randomUUID } from 'crypto';

export class SBOMParser {
  /**
   * Parses a simplified JSON SBOM (resembling CycloneDX structure)
   * @param rawJson The JSON string or object
   * @param vendorId The ID of the vendor owning this software
   * @param productName The name of the product
   * @param version The version of the product
   */
  async parse(
    rawJson: any,
    vendorId: string,
    productName: string,
    version: string
  ): Promise<SBOM> {
    const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

    // Extract components. Handling a generic 'components' array as per CycloneDX
    const components: Component[] = (data.components || []).map((c: any) => ({
      name: c.name || 'unknown',
      version: c.version || '0.0.0',
      purl: c.purl,
      license: c.licenses?.[0]?.license?.id || 'unknown',
    }));

    return {
      id: randomUUID(),
      vendorId,
      productName,
      version,
      components,
      vulnerabilities: [], // Enriched later
      uploadedAt: new Date().toISOString(),
    };
  }
}
