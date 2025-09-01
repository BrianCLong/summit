import { RuleStore } from '../rules/RuleStore';
import { RulesEngine } from '../rules/RulesEngine';
import { AlertsStore } from '../alerts/AlertsStore';
const rules = new RuleStore();
const alerts = new AlertsStore();
const engine = new RulesEngine(alerts);
export const rulesAlertsResolvers = {
    Query: {
        rules: () => rules.list(),
        alerts: () => alerts.list(),
    },
    Mutation: {
        createRule: (_, { input }) => rules.create(input),
        setRuleEnabled: (_, { id, enabled }) => {
            const rule = rules.list().find((r) => r.id === id);
            if (rule)
                rule.enabled = enabled;
            return rule;
        },
        ackAlert: (_, { id }) => alerts.ack(id),
    },
};
export { engine as rulesEngine, alerts as alertsStore, rules as ruleStore };
//# sourceMappingURL=rulesAlerts.js.map