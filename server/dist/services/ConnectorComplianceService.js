import { ForbiddenError } from 'apollo-server-express';
import { metrics } from '../monitoring/metrics.js';
/**
 * ConnectorComplianceService
 * - Enforces license/TOS + export-control gates
 * - Emits connector health/policy metrics
 */
export class ConnectorComplianceService {
    static enforceLegalBasis(input) {
        if (!input.legalBasis) {
            metrics.connectorPolicyDenialsTotal.inc();
            throw new ForbiddenError('Legal basis required for connector/task');
        }
    }
    static recordAuthError(sourceId) {
        metrics.connectorAuthErrorsTotal.inc({ source_id: sourceId });
    }
    static recordFreshnessSeconds(sourceId, seconds) {
        metrics.connectorSourceFreshnessSeconds.set({ source_id: sourceId }, seconds);
    }
    static recordDropRate(sourceId, ratio) {
        metrics.connectorDropRateRatio.set({ source_id: sourceId }, ratio);
    }
    static enforceExportControls(input) {
        const denyList = (process.env.EXPORT_CONTROL_DENY_LIST || '').split(',').map(s => s.trim()).filter(Boolean);
        if (denyList.length && input.targetCountries?.some(c => denyList.includes(c))) {
            metrics.connectorExportDenialsTotal.inc();
            throw new ForbiddenError('Export-control denied for target country');
        }
    }
}
//# sourceMappingURL=ConnectorComplianceService.js.map