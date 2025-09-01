import { TaxiiConnector } from './builtin/taxii/TaxiiConnector';
import { MispConnector } from './builtin/misp/MispConnector';
import { VirusTotalConnector } from './builtin/virustotal/VirusTotalConnector';
const connectors = {
    taxii: new TaxiiConnector(),
    misp: new MispConnector(),
    virustotal: new VirusTotalConnector(),
};
const enabled = new Set();
const licenseAcceptance = {};
export function listConnectors() {
    return Object.keys(connectors).map((name) => ({
        name,
        enabled: enabled.has(name),
    }));
}
export function enableConnector(name, tenantId, acceptLicense) {
    if (!acceptLicense) {
        throw new Error('license not accepted');
    }
    enabled.add(name);
    licenseAcceptance[tenantId] = licenseAcceptance[tenantId] || {};
    licenseAcceptance[tenantId][name] = new Date().toISOString();
}
export function disableConnector(name) {
    enabled.delete(name);
}
export function getConnector(name) {
    return connectors[name];
}
//# sourceMappingURL=registry.js.map