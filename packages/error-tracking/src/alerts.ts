import type { AlertRule } from './types';

export interface AlertConditionInput {
  errorCountThreshold?: number;
  apdexTarget?: number;
  transactionDurationMs?: number;
}

export interface AlertActionInput {
  emails?: string[];
  teamSlugs?: string[];
}

export function createAlertRule(
  name: string,
  environment: string,
  owner: string,
  conditions: AlertConditionInput = {},
  actions: AlertActionInput = {}
): AlertRule {
  const sentryConditions: AlertRule['conditions'] = [];
  if (conditions.errorCountThreshold !== undefined) {
    sentryConditions.push({ id: 'sentry.rules.conditions.too_many_errors', value: String(conditions.errorCountThreshold) });
  }
  if (conditions.apdexTarget !== undefined) {
    sentryConditions.push({ id: 'sentry.rules.conditions.apdex', value: String(conditions.apdexTarget) });
  }
  if (conditions.transactionDurationMs !== undefined) {
    sentryConditions.push({
      id: 'sentry.rules.conditions.latency',
      value: String(conditions.transactionDurationMs),
      target: 'transaction.duration'
    });
  }

  const sentryActions: AlertRule['actions'] = [];
  for (const email of actions.emails ?? []) {
    sentryActions.push({ id: 'sentry.rules.actions.notify_email', targetType: 'email', targetIdentifier: email });
  }
  for (const team of actions.teamSlugs ?? []) {
    sentryActions.push({ id: 'sentry.rules.actions.notify_team', targetType: 'team', targetIdentifier: team });
  }

  if (sentryConditions.length === 0) {
    throw new Error('At least one alert condition must be provided.');
  }

  if (sentryActions.length === 0) {
    throw new Error('At least one alert action must be provided.');
  }

  const rule: AlertRule = {
    name,
    environment,
    actionMatch: 'all',
    conditions: sentryConditions,
    actions: sentryActions,
    owner
  };

  return rule;
}
