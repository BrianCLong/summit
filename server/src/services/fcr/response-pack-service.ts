import { FcrAlert, FcrResponsePack } from './types.js';

const PLAYBOOKS: Record<FcrAlert['severity'], FcrResponsePack> = {
  low: {
    playbook_id: 'fcr-low-signal',
    recommended_actions: ['Monitor spread', 'Collect public exemplars'],
    diffusion_summary: 'Low velocity cluster. Maintain watch.',
  },
  medium: {
    playbook_id: 'fcr-medium-signal',
    recommended_actions: [
      'Notify comms lead',
      'Prepare counter-narrative draft',
    ],
    diffusion_summary: 'Moderate coordination across channels.',
  },
  high: {
    playbook_id: 'fcr-high-signal',
    recommended_actions: [
      'Activate incident response',
      'Engage platform trust teams',
      'Issue stakeholder brief',
    ],
    diffusion_summary: 'High velocity cluster. Coordination likely.',
  },
  critical: {
    playbook_id: 'fcr-critical-signal',
    recommended_actions: [
      'Activate crisis comms',
      'Coordinate cross-tenant mitigation',
      'Escalate to exec review',
    ],
    diffusion_summary: 'Critical surge across tenants/regions.',
  },
};

export class FcrResponsePackService {
  buildResponsePack(alert: FcrAlert) {
    return PLAYBOOKS[alert.severity];
  }
}
