"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybookManager = void 0;
const SecuriteyesService_js_1 = require("./SecuriteyesService.js");
const types_js_1 = require("../models/types.js");
class PlaybookManager {
    static instance;
    securiteyes;
    playbooks = [];
    constructor() {
        this.securiteyes = SecuriteyesService_js_1.SecuriteyesService.getInstance();
        this.registerDefaultPlaybooks();
    }
    getSecuriteyes() {
        // Use the instance property if initialized, otherwise get singleton
        // This is to support mocking in tests where the singleton mock might be replaced
        return SecuriteyesService_js_1.SecuriteyesService.getInstance();
    }
    static getInstance() {
        if (!PlaybookManager.instance) {
            PlaybookManager.instance = new PlaybookManager();
        }
        return PlaybookManager.instance;
    }
    registerDefaultPlaybooks() {
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
    getPlaybooks() {
        return this.playbooks;
    }
    async executePlaybook(playbookId, context, tenantId) {
        const playbook = this.playbooks.find(p => p.id === playbookId);
        if (!playbook)
            throw new Error('Playbook not found');
        // Log the execution as a mitigation node
        const mitigation = await this.getSecuriteyes().createNode(types_js_1.NODE_LABELS.MITIGATION, {
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
exports.PlaybookManager = PlaybookManager;
