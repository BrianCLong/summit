import { RuleStore } from '../rules/RuleStore';
import { RulesEngine, Rule } from '../rules/RulesEngine';
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
    createRule: (_: any, { input }: { input: Rule }) => rules.create(input),
    setRuleEnabled: (_: any, { id, enabled }: { id: string; enabled: boolean }) => {
      const rule = rules.list().find((r) => r.id === id);
      if (rule) rule.enabled = enabled;
      return rule;
    },
    ackAlert: (_: any, { id }: { id: string }) => alerts.ack(id),
  },
};

export { engine as rulesEngine, alerts as alertsStore, rules as ruleStore };
