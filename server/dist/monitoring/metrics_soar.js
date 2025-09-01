import { Counter } from 'prom-client';
export const playbookActions = new Counter({
    name: 'playbook_actions_total',
    help: 'count of playbook actions'
});
//# sourceMappingURL=metrics_soar.js.map