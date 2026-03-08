"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SBOMParser = void 0;
const crypto_1 = require("crypto");
class SBOMParser {
    /**
     * Parses a simplified JSON SBOM (resembling CycloneDX structure)
     * @param rawJson The JSON string or object
     * @param vendorId The ID of the vendor owning this software
     * @param productName The name of the product
     * @param version The version of the product
     */
    async parse(rawJson, vendorId, productName, version) {
        const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        // Extract components. Handling a generic 'components' array as per CycloneDX
        const components = (data.components || []).map((c) => ({
            name: c.name || 'unknown',
            version: c.version || '0.0.0',
            purl: c.purl,
            license: c.licenses?.[0]?.license?.id || 'unknown',
        }));
        return {
            id: (0, crypto_1.randomUUID)(),
            vendorId,
            productName,
            version,
            components,
            vulnerabilities: [], // Enriched later
            uploadedAt: new Date().toISOString(),
        };
    }
}
exports.SBOMParser = SBOMParser;
