
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function validateProvenance(provPath) {
    if (!existsSync(provPath)) {
        console.warn(`⚠️  Provenance not found at ${provPath}`);
        return true; // Skip if not present
    }
    try {
        const prov = JSON.parse(readFileSync(provPath, 'utf8'));
        if (prov._type !== 'https://in-toto.io/Statement/v0.1' || !prov.predicate) {
            console.error('❌ Invalid Provenance: not an in-toto statement or missing predicate');
            return false;
        }
        const type = prov.predicateType;
        if (type === 'https://slsa.dev/provenance/v1') {
            if (!prov.predicate.buildDefinition || !prov.predicate.runDetails) {
                console.error('❌ SLSA v1.0 Provenance missing required fields');
                return false;
            }
        } else if (type === 'https://slsa.dev/provenance/v0.2') {
            if (!prov.predicate.builder || !prov.predicate.buildConfig) {
                console.error('❌ SLSA v0.2 Provenance missing required fields');
                return false;
            }
        } else {
            console.warn(`⚠️  Unknown Provenance type: ${type}`);
        }

        if (!prov.subject || !Array.isArray(prov.subject) || prov.subject.length === 0) {
            console.error('❌ Provenance missing subject array or is empty');
            return false;
        }
        for (const s of prov.subject) {
            if (!s.name || !s.digest) {
                console.error(`❌ Incomplete subject in provenance: ${JSON.stringify(s)}`);
                return false;
            }
        }
        console.log('✅ Provenance Quality Verification PASSED');
        return true;
    } catch (e) {
        console.error(`❌ Provenance Parsing Error: ${e.message}`);
        return false;
    }
}
