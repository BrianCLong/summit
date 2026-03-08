"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const attack_surface_js_1 = require("../attack-surface.js");
(0, globals_1.describe)('AttackSurfaceMapper', () => {
    const mapper = new attack_surface_js_1.AttackSurfaceMapper();
    (0, globals_1.it)('should discover assets including cloud resources and s3 buckets', async () => {
        const target = 'example.com';
        const result = await mapper.performReconnaissance(target, {
            includeSubdomains: true,
            includeCloudAssets: true
        });
        (0, globals_1.expect)(result.organizationId).toBe(target);
        (0, globals_1.expect)(result.assets.length).toBeGreaterThan(0);
        const cloudAssets = result.assets.filter(a => a.type === 'cloud-resource');
        (0, globals_1.expect)(cloudAssets.length).toBeGreaterThan(0);
        // Check if S3 buckets are found (deterministic simulation)
        const s3Assets = cloudAssets.filter(a => a.identifier.startsWith('s3://'));
        (0, globals_1.expect)(s3Assets.length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should identify vulnerabilities based on service versions', async () => {
        const target = 'vulnerable-target.com';
        const result = await mapper.performReconnaissance(target, {
            includeServices: true
        });
        // Check for CVE risks
        const assetsWithVulns = result.assets.filter(a => a.risks.some(r => r.category === 'vulnerability'));
        (0, globals_1.expect)(assetsWithVulns.length).toBeGreaterThan(0);
        const cveRisk = assetsWithVulns[0].risks.find(r => r.category === 'vulnerability');
        (0, globals_1.expect)(cveRisk).toBeDefined();
        (0, globals_1.expect)(cveRisk?.factors[0]).toMatch(/CVE-/);
    });
    (0, globals_1.it)('should generate appropriate exposures for risks', async () => {
        const target = 'exposed.com';
        const result = await mapper.performReconnaissance(target, {
            includeServices: true,
            includeCloudAssets: true
        });
        const vulnExposures = result.exposures.filter(e => e.type === 'vulnerable-service');
        (0, globals_1.expect)(vulnExposures.length).toBeGreaterThan(0);
        (0, globals_1.expect)(vulnExposures[0].severity).toMatch(/critical|high|medium/);
    });
});
