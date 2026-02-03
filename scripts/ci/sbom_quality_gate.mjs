
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function validateSbom(sbomPath) {
    if (!existsSync(sbomPath)) {
        console.warn(`⚠️  SBOM not found at ${sbomPath}`);
        return true; // Skip if not present
    }
    try {
        const sbom = JSON.parse(readFileSync(sbomPath, 'utf8'));
        if (!sbom.spdxVersion || !sbom.packages || !Array.isArray(sbom.packages)) {
            console.error('❌ Invalid SBOM structure: missing spdxVersion or packages array');
            return false;
        }
        const issues = [];
        sbom.packages.forEach((pkg, idx) => {
            if (!pkg.versionInfo) issues.push(`Package[${idx}] missing versionInfo: ${pkg.name}`);
            if (!pkg.licenseDeclared) issues.push(`Package[${idx}] missing licenseDeclared: ${pkg.name}`);
            if (!pkg.supplier) issues.push(`Package[${idx}] missing supplier: ${pkg.name}`);
            const hasPurl = pkg.externalRefs?.some(ref => ref.referenceType?.includes('purl'));
            if (!hasPurl) issues.push(`Package[${idx}] missing PURL: ${pkg.name}`);
        });

        if (issues.length > 0) {
            console.error('❌ SBOM Quality Issues:');
            issues.slice(0, 10).forEach(i => console.error(`   - ${i}`));
            if (issues.length > 10) console.error(`   ... and ${issues.length - 10} more`);
            return false;
        }
        console.log('✅ SBOM Quality Verification PASSED');
        return true;
    } catch (e) {
        console.error(`❌ SBOM Parsing Error: ${e.message}`);
        return false;
    }
}
