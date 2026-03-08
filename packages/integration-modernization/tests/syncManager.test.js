"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const syncManager_1 = require("../src/syncManager");
describe('SyncManager', () => {
    it('tracks incremental and full resyncs with reconciliation and quarantine', () => {
        const manager = new syncManager_1.SyncManager();
        manager.defineSystemOfRecord('user', 'crm');
        const incremental = manager.incrementalSync('crm', 't1', [{ id: 1 }]);
        const full = manager.fullResync('crm', [{ id: 2 }]);
        expect(incremental.token).toBe('t1');
        expect(full.fullResync).toBe(true);
        expect(manager.timelineFor('crm').length).toBe(2);
        const reconciliation = manager.reconcile('crm', { id: 1, email: 'old' }, { id: 1, email: 'new' }, ['id', 'email']);
        expect(reconciliation.drift.email.actual).toBe('new');
        const isValid = manager.validatePayload('crm', { id: 3, email: 'bad' }, [
            (payload) => typeof payload.id === 'number',
            (payload) => Boolean(payload.email.match(/@/))
        ]);
        expect(isValid).toBe(false);
        expect(manager.quarantineRecords().length).toBe(1);
    });
});
