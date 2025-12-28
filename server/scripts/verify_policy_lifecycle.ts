import assert from 'node:assert/strict';
import { PolicyLifecycleService } from '../src/services/policy/PolicyLifecycleService.js';
import { PolicyStatus } from '../src/services/policy/types.js';

// --- Mock Database ---
class MockDb {
    store: any = {
        policies: [],
        policy_versions: []
    };
    inTransaction = false;

    async query(text: string, params: any[] = []) {
        if (text === 'BEGIN') {
            this.inTransaction = true;
            return { rows: [] };
        }
        if (text === 'COMMIT') {
            this.inTransaction = false;
            return { rows: [] };
        }
        if (text === 'ROLLBACK') {
            this.inTransaction = false;
            return { rows: [] };
        }

        if (text.includes('INSERT INTO policies')) {
            const id = 'policy-' + (this.store.policies.length + 1);
            this.store.policies.push({ id, tenant_id: params[0] });
            return { rows: [{ id }] };
        }
        if (text.includes('SELECT id FROM policies')) {
            const policy = this.store.policies.find((p: any) => p.tenant_id === params[0]);
            return { rows: policy ? [policy] : [] };
        }
        if (text.includes('SELECT MAX(version_number)')) {
            const versions = this.store.policy_versions.filter((v: any) => v.policy_id === params[0]);
            const max = versions.length > 0 ? Math.max(...versions.map((v: any) => v.version_number)) : 0;
            return { rows: [{ max_ver: max }] };
        }
        if (text.includes('INSERT INTO policy_versions')) {
            const newVersion = {
                id: 'ver-' + (this.store.policy_versions.length + 1),
                policy_id: params[0],
                version_number: params[1],
                content: JSON.parse(params[2]),
                status: params[3],
                created_by: params[4]
            };
            this.store.policy_versions.push(newVersion);
            return { rows: [newVersion] };
        }
        if (text.includes('UPDATE policy_versions') && text.includes('SET status = $1, approved_by = $2')) {
             // Approve
             const version = this.store.policy_versions.find((v: any) => v.id === params[3]);
             if (version) {
                 version.status = params[0];
                 version.approved_by = params[1];
                 // Note: Logic continues in next calls for transaction
                 return { rows: [{ ...version, policy_id: version.policy_id }] };
             }
             return { rows: [] };
        }
        if (text.includes('UPDATE policy_versions') && text.includes('SET status = $1, updated_at')) {
            // Submit for review
            const version = this.store.policy_versions.find((v: any) => v.id === params[1]);
            if (version) {
                version.status = params[0];
                return { rows: [version] };
            }
            return { rows: [] };
        }
        if (text.includes('UPDATE policies SET active_version_id')) {
            const policy = this.store.policies.find((p: any) => p.id === params[1]);
            if (policy) policy.active_version_id = params[0];
            return { rows: [] };
        }
        if (text.includes('UPDATE policy_versions') && text.includes('SET status = $1') && text.includes('WHERE policy_id = $2')) {
            // Archive old
            // Simplified mock: just update in store
             this.store.policy_versions.forEach((v: any) => {
                 if (v.policy_id === params[1] && v.id !== params[2] && v.status === params[3]) {
                     v.status = params[0];
                 }
             });
             return { rows: [] };
        }
        if (text.includes('SELECT pv.content')) {
            // Get Active
            const policy = this.store.policies.find((p: any) => p.tenant_id === params[0]);
            if (policy && policy.active_version_id) {
                const version = this.store.policy_versions.find((v: any) => v.id === policy.active_version_id);
                return { rows: [{ content: version.content }] };
            }
            return { rows: [] };
        }

        return { rows: [] };
    }
}

async function run() {
    console.log('Running Policy Lifecycle Verification...');

    const mockDb = new MockDb();
    const service = PolicyLifecycleService.getInstance(mockDb);
    const tenantId = 'tenant-A';
    const userId = 'user-1';
    const adminId = 'admin-1';

    // 1. Create Draft
    console.log('Test: Create Draft');
    const draft = await service.createDraft(tenantId, userId, {
        metadata: { name: 'My Policy', author: 'me@test.com', version: '1.0' },
        scope: {},
        capabilities: [],
        approvals: []
    });
    assert.equal(draft.status, PolicyStatus.DRAFT);
    assert.equal(draft.version_number, 1);
    console.log('PASS: Draft created');

    // 2. Submit for Review
    console.log('Test: Submit for Review');
    const pending = await service.submitForReview(draft.id, userId);
    assert.equal(pending.status, PolicyStatus.PENDING_REVIEW);
    console.log('PASS: Submitted for review');

    // 3. Approve
    console.log('Test: Approve');
    const active = await service.approve(pending.id, adminId, 'Looks good');
    assert.equal(active.status, PolicyStatus.ACTIVE);
    assert.equal(active.approved_by, adminId);
    console.log('PASS: Approved');

    // 4. Verify Active Policy Fetch
    console.log('Test: Get Active Policy');
    const fetchedPolicy = await service.getActivePolicy(tenantId);
    assert.ok(fetchedPolicy);
    assert.equal(fetchedPolicy.metadata.name, 'My Policy');
    console.log('PASS: Active policy fetched');

    // 5. Create Second Version
    console.log('Test: Create V2 Draft');
    const draft2 = await service.createDraft(tenantId, userId, {
        metadata: { name: 'My Policy V2', author: 'me@test.com', version: '2.0' },
        scope: {},
        capabilities: [],
        approvals: []
    });
    assert.equal(draft2.version_number, 2);

    // Verify V1 is still active
    const activeV1 = await service.getActivePolicy(tenantId);
    assert.equal(activeV1.metadata.version, '1.0');
    console.log('PASS: V2 Draft created, V1 still active');

    console.log('All Lifecycle Tests Passed!');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
