type Selector = {
  label?: string;
  match?: Record<string, unknown>;
};

type Rule = {
  threshold?: number;
};

type Alert = {
  ruleId?: string;
  entityId?: string;
  createdAt?: Date;
};

export function selectorToCypher(selector: Selector): {
  query: string;
  params: Record<string, unknown>;
} {
  const label = selector.label ? `:${selector.label}` : '';
  const params: Record<string, unknown> = {};
  const match = selector.match ?? {};
  const filters = Object.entries(match).map(([key, value]) => {
    params[key] = value;
    return `n.${key} = $${key}`;
  });

  const where = filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : '';
  return {
    query: `MATCH (n${label})${where} RETURN n`,
    params,
  };
}

export function computeScore(
  weights: Record<string, number>,
  rule: Rule,
  data: Record<string, unknown>,
): number {
  const score = Object.keys(weights).reduce((total, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return total + weights[key];
    }
    return total;
  }, 0);

  const threshold = rule.threshold ?? 0;
  return score >= threshold ? score : 0;
}

export function dedupeAlerts(
  alerts: Alert[],
  newAlert: Alert,
  windowMs: number,
): Alert[] {
  const createdAt = newAlert.createdAt;
  if (!createdAt) {
    return [...alerts, newAlert];
  }

  const isDuplicate = alerts.some((alert) => {
    if (!alert.createdAt) return false;
    if (alert.ruleId !== newAlert.ruleId) return false;
    if (alert.entityId !== newAlert.entityId) return false;
    const diff = Math.abs(alert.createdAt.getTime() - createdAt.getTime());
    return diff <= windowMs;
  });

  return isDuplicate ? alerts : [...alerts, newAlert];
}
