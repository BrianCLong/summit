import { Connector } from './ConnectorSDK';
import { TaxiiConnector } from './builtin/taxii/TaxiiConnector';
import { MispConnector } from './builtin/misp/MispConnector';
import { VirusTotalConnector } from './builtin/virustotal/VirusTotalConnector';

const connectors: Record<string, Connector> = {
  taxii: new TaxiiConnector(),
  misp: new MispConnector(),
  virustotal: new VirusTotalConnector(),
};

const enabled = new Set<string>();
const licenseAcceptance: Record<string, Record<string, string>> = {};

export function listConnectors() {
  return Object.keys(connectors).map((name) => ({
    name,
    enabled: enabled.has(name),
  }));
}

export function enableConnector(
  name: string,
  tenantId: string,
  acceptLicense: boolean,
) {
  if (!acceptLicense) {
    throw new Error('license not accepted');
  }
  enabled.add(name);
  licenseAcceptance[tenantId] = licenseAcceptance[tenantId] || {};
  licenseAcceptance[tenantId][name] = new Date().toISOString();
}

export function disableConnector(name: string) {
  enabled.delete(name);
}

export function getConnector(name: string) {
  return connectors[name];
}
