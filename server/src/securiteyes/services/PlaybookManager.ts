import { SecuriteyesService } from './SecuriteyesService.js';
import { NODE_LABELS, Mitigation } from '../models/types.js';

export interface Playbook {
    id: string;
    name: string;
    description: string;
    actions: PlaybookAction[];
}

export interface PlaybookAction {
    id: string;
    type: 'revoke_token' | 'block_ip' | 'lock_account' | 'notify_security';
    params: string[];
}

export class PlaybookManager {
    private static instance: PlaybookManager;
    private securiteyes: SecuriteyesService;
    private playbooks: Playbook[] = [];

    private constructor() {
        this.securiteyes = SecuriteyesService.getInstance();
        this.registerDefaultPlaybooks();
    }

    private getSecuriteyes() {
        // Use the instance property if initialized, otherwise get singleton
        // This is to support mocking in tests where the singleton mock might be replaced
        return SecuriteyesService.getInstance();
    }

    public static getInstance(): PlaybookManager {
        if (!PlaybookManager.instance) {
            PlaybookManager.instance = new PlaybookManager();
        }
        return PlaybookManager.instance;
    }

    private registerDefaultPlaybooks() {
        this.playbooks.push({
            id: 'PB_CREDENTIAL_COMPROMISE',
            name: 'Credential Compromise Response',
            description: 'Standard response for confirmed credential theft.',
            actions: [
                { id: 'act_lock', type: 'lock_account', params: ['userId'] },
                { id: 'act_revoke', type: 'revoke_token', params: ['userId'] },
                { id: 'act_notify', type: 'notify_security', params: ['userId', 'severity'] }
            ]
        });

        this.playbooks.push({
            id: 'PB_DATA_EXFIL',
            name: 'Data Exfiltration Containment',
            description: 'Block access and preserve evidence for data exfiltration.',
            actions: [
                { id: 'act_block_ip', type: 'block_ip', params: ['ipAddress'] },
                { id: 'act_lock', type: 'lock_account', params: ['userId'] }
            ]
        });
    }

    getPlaybooks(): Playbook[] {
        return this.playbooks;
    }

    async executePlaybook(playbookId: string, context: Record<string, any>, tenantId: string): Promise<{ success: boolean, mitigationId?: string }> {
        const playbook = this.playbooks.find(p => p.id === playbookId);
        if (!playbook) throw new Error('Playbook not found');

        // Log the execution as a mitigation node
        const mitigation = await this.getSecuriteyes().createNode<Mitigation>(NODE_LABELS.MITIGATION, {
            tenantId,
            type: 'playbook_execution',
            description: `Executed playbook ${playbook.name}`,
            active: true
        });

        // In a real system, this would trigger actual side effects (Auth0 API calls, firewall updates).
        // For MVP/Defensive system, we record the *intent* and the *action*.
        console.log(`[PlaybookManager] Executing ${playbook.name} for tenant ${tenantId}`, context);

        return { success: true, mitigationId: mitigation?.id };
    }
}
