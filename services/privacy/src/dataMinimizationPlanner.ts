import { createHash } from 'crypto';

export type AggregationType = 'count' | 'sum' | 'avg' | 'countDistinct';

export interface AggregationSpec {
  type: AggregationType;
  feature?: string;
  groupBy?: string[];
}

export interface MetricSpec {
  name: string;
  description?: string;
  targetAccuracy: number;
  aggregator: AggregationSpec;
  requires: string[];
}

export type FeatureType = 'number' | 'string' | 'date';

export interface FeatureSpec {
  name: string;
  table: string;
  column: string;
  type: FeatureType;
  pii?: boolean;
}

export interface BucketCoarsening {
  type: 'bucket';
  size: number;
}

export interface RoundCoarsening {
  type: 'round';
  precision: number;
}

export interface TruncateCoarsening {
  type: 'truncate';
  unit: 'day' | 'month' | 'year';
}

export type CoarseningStrategy = BucketCoarsening | RoundCoarsening | TruncateCoarsening;

export interface HashRedaction {
  type: 'hash';
  algorithm?: 'sha256';
}

export interface MaskRedaction {
  type: 'mask';
  maskWith?: string;
  preserve?: number;
}

export interface RemoveRedaction {
  type: 'remove';
}

export type RedactionStrategy = HashRedaction | MaskRedaction | RemoveRedaction;

export interface PolicySpec {
  name: string;
  type: 'redact' | 'coarsen';
  appliesTo: string[];
  strategy: RedactionStrategy | CoarseningStrategy;
  rationale?: string;
}

export interface FixtureSpec {
  table: string;
  baselineRows: Record<string, unknown>[];
}

export interface TaskSpec {
  name: string;
  metrics: MetricSpec[];
  features: FeatureSpec[];
  policies: PolicySpec[];
  fixture: FixtureSpec;
}

export interface RedactionAction {
  type: 'retain' | 'drop' | 'hash' | 'mask' | 'coarsen';
  detail?: string;
  rationale?: string;
}

export interface RedactionDecision {
  feature: string;
  included: boolean;
  actions: RedactionAction[];
}

export interface SQLViewDefinition {
  name: string;
  table: string;
  description: string;
  sql: string;
}

export interface AggregationGroupResult {
  group: Record<string, unknown>;
  value: number;
}

export interface MetricAccuracy {
  metric: string;
  baseline: AggregationGroupResult[];
  minimalView: AggregationGroupResult[];
  accuracy: number;
  meetsTarget: boolean;
}

export interface ExposureSummary {
  fields: number;
  rows: number;
}

export interface ImpactDelta {
  absolute: number;
  percent: number;
}

export interface ImpactSummary {
  baseline: ExposureSummary;
  minimal: ExposureSummary;
  fieldDelta: ImpactDelta;
  rowDelta: ImpactDelta;
}

export interface ImpactSimulator extends ImpactSummary {
  run: (rows: Record<string, unknown>[]) => ImpactSummary;
}

export interface DataMinimizationPlan {
  views: SQLViewDefinition[];
  redactionMap: Record<string, RedactionDecision>;
  accuracyReport: MetricAccuracy[];
  impactSimulator: ImpactSimulator;
}

type FeaturePolicy = {
  coarsening?: CoarseningStrategy;
  redaction?: RedactionStrategy;
  rationale: string[];
};

type ProcessedRow = Record<string, unknown>;

type MetricAccumulator = {
  groupKey: string;
  group: Record<string, unknown>;
  sum?: number;
  count?: number;
  distinct?: Set<string>;
};

function buildFeaturePolicyIndex(policies: PolicySpec[]): Map<string, FeaturePolicy> {
  const index = new Map<string, FeaturePolicy>();
  for (const policy of policies) {
    for (const feature of policy.appliesTo) {
      const entry = index.get(feature) ?? { rationale: [] };
      entry.rationale.push(policy.rationale ?? policy.name);
      if (policy.type === 'coarsen') {
        entry.coarsening = policy.strategy as CoarseningStrategy;
      } else if (policy.type === 'redact') {
        entry.redaction = policy.strategy as RedactionStrategy;
      }
      index.set(feature, entry);
    }
  }
  return index;
}

function applyCoarseningSql(expression: string, strategy?: CoarseningStrategy): string {
  if (!strategy) return expression;
  switch (strategy.type) {
    case 'bucket':
      return `FLOOR(${expression} / ${strategy.size}) * ${strategy.size}`;
    case 'round':
      return `ROUND(${expression}, ${strategy.precision})`;
    case 'truncate':
      return `DATE_TRUNC('${strategy.unit}', ${expression})`;
    default:
      return expression;
  }
}

function applyRedactionSql(expression: string, strategy?: RedactionStrategy): string {
  if (!strategy) return expression;
  switch (strategy.type) {
    case 'hash':
      return `SHA2(${expression}, 256)`;
    case 'mask': {
      const mask = strategy.maskWith ?? '*';
      const preserve = strategy.preserve ?? 4;
      return `CONCAT(SUBSTRING(${expression}, 1, ${preserve}), REPEAT('${mask}', GREATEST(LENGTH(${expression}) - ${preserve}, 0)))`;
    }
    case 'remove':
      return 'NULL';
    default:
      return expression;
  }
}

function applyCoarseningValue(value: unknown, strategy?: CoarseningStrategy): unknown {
  if (value === undefined || value === null || !strategy) return value;
  if (strategy.type === 'bucket') {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value;
    return Math.floor(numeric / strategy.size) * strategy.size;
  }
  if (strategy.type === 'round') {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value;
    const factor = 10 ** strategy.precision;
    return Math.round(numeric * factor) / factor;
  }
  if (strategy.type === 'truncate') {
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return value;
    if (strategy.unit === 'day') {
      date.setUTCHours(0, 0, 0, 0);
      return date.toISOString().slice(0, 10);
    }
    if (strategy.unit === 'month') {
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      return date.toISOString().slice(0, 7);
    }
    if (strategy.unit === 'year') {
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      return date.getUTCFullYear();
    }
  }
  return value;
}

function applyRedactionValue(value: unknown, strategy?: RedactionStrategy): unknown {
  if (value === undefined || value === null || !strategy) return value;
  if (strategy.type === 'remove') return undefined;
  const text = String(value);
  if (strategy.type === 'hash') {
    return createHash('sha256').update(text).digest('hex');
  }
  if (strategy.type === 'mask') {
    const mask = strategy.maskWith ?? '*';
    const preserve = strategy.preserve ?? 4;
    const head = text.slice(0, preserve);
    const maskedLength = Math.max(text.length - preserve, 0);
    return head + mask.repeat(maskedLength);
  }
  return value;
}

function sanitizeIdentifier(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
}

function sortKeys<T>(items: T[], selector: (item: T) => string): T[] {
  return [...items].sort((a, b) => selector(a).localeCompare(selector(b)));
}

function buildColumnExpression(
  feature: FeatureSpec,
  policy: FeaturePolicy | undefined,
  alias: string,
  { forAggregation }: { forAggregation?: boolean } = {},
): string {
  const columnRef = `${feature.table}.${feature.column}`;
  const coarsened = applyCoarseningSql(columnRef, policy?.coarsening);
  const transformed = forAggregation ? applyRedactionSql(coarsened, policy?.redaction) : applyRedactionSql(coarsened, policy?.redaction);
  return forAggregation ? transformed : `${transformed} AS "${alias}"`;
}

function ensureFeatureExists(featureName: string, featureMap: Map<string, FeatureSpec>): FeatureSpec {
  const feature = featureMap.get(featureName);
  if (!feature) {
    throw new Error(`Unknown feature reference: ${featureName}`);
  }
  return feature;
}

function serializeGroup(group: Record<string, unknown>): string {
  const entries = Object.entries(group).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
}

function computeProcessedRows(
  rows: Record<string, unknown>[],
  featureMap: Map<string, FeatureSpec>,
  policies: Map<string, FeaturePolicy>,
  featureNames: Set<string>,
): ProcessedRow[] {
  return rows.map((row) => {
    const processed: ProcessedRow = {};
    for (const featureName of featureNames) {
      const feature = ensureFeatureExists(featureName, featureMap);
      const policy = policies.get(featureName);
      const rawValue = row[feature.column] ?? row[feature.name];
      const coarsened = applyCoarseningValue(rawValue, policy?.coarsening);
      const redacted = applyRedactionValue(coarsened, policy?.redaction);
      if (redacted !== undefined) {
        processed[featureName] = redacted;
      }
    }
    return processed;
  });
}

function initAccumulator(metric: MetricSpec): MetricAccumulator {
  return {
    groupKey: '',
    group: {},
    sum: metric.aggregator.type === 'count' ? undefined : 0,
    count: 0,
    distinct: metric.aggregator.type === 'countDistinct' ? new Set<string>() : undefined,
  };
}

function updateAccumulator(
  metric: MetricSpec,
  accumulator: MetricAccumulator,
  row: ProcessedRow,
): void {
  const { aggregator } = metric;
  const valueFeature = aggregator.feature;
  if (aggregator.type === 'count') {
    accumulator.count = (accumulator.count ?? 0) + 1;
    return;
  }
  if (!valueFeature) {
    throw new Error(`Metric ${metric.name} requires feature reference for aggregation`);
  }
  const raw = row[valueFeature];
  if (raw === undefined || raw === null) {
    return;
  }
  if (aggregator.type === 'sum' || aggregator.type === 'avg') {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      accumulator.sum = (accumulator.sum ?? 0) + numeric;
      accumulator.count = (accumulator.count ?? 0) + 1;
    }
    return;
  }
  if (aggregator.type === 'countDistinct') {
    accumulator.distinct?.add(String(raw));
    return;
  }
}

function finalizeAccumulator(metric: MetricSpec, accumulator: MetricAccumulator): number {
  switch (metric.aggregator.type) {
    case 'count':
      return accumulator.count ?? 0;
    case 'sum':
      return accumulator.sum ?? 0;
    case 'avg': {
      const sum = accumulator.sum ?? 0;
      const count = accumulator.count ?? 0;
      return count === 0 ? 0 : sum / count;
    }
    case 'countDistinct':
      return accumulator.distinct ? accumulator.distinct.size : 0;
    default:
      return 0;
  }
}

function computeMetricAggregation(rows: ProcessedRow[], metric: MetricSpec): AggregationGroupResult[] {
  const results = new Map<string, MetricAccumulator>();
  const groupFeatures = metric.aggregator.groupBy ?? [];

  for (const row of rows) {
    const group: Record<string, unknown> = {};
    for (const featureName of groupFeatures) {
      group[featureName] = row[featureName];
    }
    const groupKey = serializeGroup(group);
    if (!results.has(groupKey)) {
      const accumulator = initAccumulator(metric);
      accumulator.group = group;
      accumulator.groupKey = groupKey;
      results.set(groupKey, accumulator);
    }
    const accumulator = results.get(groupKey)!;
    updateAccumulator(metric, accumulator, row);
  }

  const aggregated = Array.from(results.values()).map((accumulator) => ({
    group: accumulator.group,
    value: finalizeAccumulator(metric, accumulator),
  }));

  return sortKeys(aggregated, (entry) => serializeGroup(entry.group));
}

function computeMetricAccuracy(baseline: AggregationGroupResult[], minimal: AggregationGroupResult[]): number {
  const unionKeys = new Set<string>();
  const baselineMap = new Map<string, number>();
  const minimalMap = new Map<string, number>();

  for (const entry of baseline) {
    const key = serializeGroup(entry.group);
    unionKeys.add(key);
    baselineMap.set(key, entry.value);
  }
  for (const entry of minimal) {
    const key = serializeGroup(entry.group);
    unionKeys.add(key);
    minimalMap.set(key, entry.value);
  }

  let minAccuracy = 1;
  for (const key of unionKeys) {
    const baselineValue = baselineMap.get(key) ?? 0;
    const minimalValue = minimalMap.get(key) ?? 0;
    if (baselineValue === 0 && minimalValue === 0) {
      continue;
    }
    const error = Math.abs(baselineValue - minimalValue);
    const accuracy = 1 - error / (Math.abs(baselineValue) || 1);
    if (accuracy < minAccuracy) {
      minAccuracy = accuracy;
    }
  }
  return Number.isFinite(minAccuracy) ? minAccuracy : 1;
}

function computeExposureSummary(
  rows: Record<string, unknown>[],
  featureMap: Map<string, FeatureSpec>,
  policies: Map<string, FeaturePolicy>,
  requiredFeatures: Set<string>,
  groupByFeatures: Set<string>,
): ExposureSummary {
  const processed = computeProcessedRows(rows, featureMap, policies, requiredFeatures);
  const uniqueGroups = new Set<string>();
  for (const row of processed) {
    const group: Record<string, unknown> = {};
    for (const feature of groupByFeatures) {
      if (row[feature] !== undefined) {
        group[feature] = row[feature];
      }
    }
    uniqueGroups.add(serializeGroup(group));
  }
  const fieldCount = Array.from(requiredFeatures).filter((feature) => {
    const policy = policies.get(feature);
    if (policy?.redaction?.type === 'remove') return false;
    return true;
  }).length;
  return {
    fields: fieldCount,
    rows: uniqueGroups.size,
  };
}

function buildRedactionDecision(
  feature: FeatureSpec,
  policy: FeaturePolicy | undefined,
  included: boolean,
  droppedByRequirement: boolean,
): RedactionDecision {
  const actions: RedactionAction[] = [];
  if (!included) {
    actions.push({ type: 'drop', rationale: droppedByRequirement ? 'Not required by metrics' : 'Removed via policy' });
  } else {
    if (policy?.coarsening) {
      if (policy.coarsening.type === 'bucket') {
        actions.push({
          type: 'coarsen',
          detail: `bucket(size=${policy.coarsening.size})`,
          rationale: policy.rationale.join('; '),
        });
      } else if (policy.coarsening.type === 'round') {
        actions.push({
          type: 'coarsen',
          detail: `round(precision=${policy.coarsening.precision})`,
          rationale: policy.rationale.join('; '),
        });
      } else if (policy.coarsening.type === 'truncate') {
        actions.push({
          type: 'coarsen',
          detail: `truncate(${policy.coarsening.unit})`,
          rationale: policy.rationale.join('; '),
        });
      }
    }
    if (policy?.redaction) {
      if (policy.redaction.type === 'hash') {
        actions.push({ type: 'hash', detail: 'sha256', rationale: policy.rationale.join('; ') });
      } else if (policy.redaction.type === 'mask') {
        actions.push({
          type: 'mask',
          detail: `mask(${policy.redaction.maskWith ?? '*'})`,
          rationale: policy.rationale.join('; '),
        });
      }
    }
    if (actions.length === 0) {
      actions.push({ type: 'retain', rationale: 'Required for metric accuracy' });
    }
  }
  return {
    feature: feature.name,
    included,
    actions,
  };
}

export function planMinimalViews(task: TaskSpec): DataMinimizationPlan {
  const featureMap = new Map(task.features.map((feature) => [feature.name, feature]));
  const policies = buildFeaturePolicyIndex(task.policies);

  const requiredFeatures = new Set<string>();
  const groupByFeatures = new Set<string>();
  for (const metric of task.metrics) {
    for (const featureName of metric.requires) {
      ensureFeatureExists(featureName, featureMap);
      requiredFeatures.add(featureName);
    }
    for (const groupFeature of metric.aggregator.groupBy ?? []) {
      ensureFeatureExists(groupFeature, featureMap);
      requiredFeatures.add(groupFeature);
      groupByFeatures.add(groupFeature);
    }
    if (metric.aggregator.feature) {
      ensureFeatureExists(metric.aggregator.feature, featureMap);
      requiredFeatures.add(metric.aggregator.feature);
    }
  }

  const viewFeaturesByTable = new Map<string, Set<string>>();
  for (const featureName of requiredFeatures) {
    const feature = ensureFeatureExists(featureName, featureMap);
    const existing = viewFeaturesByTable.get(feature.table) ?? new Set<string>();
    existing.add(featureName);
    viewFeaturesByTable.set(feature.table, existing);
  }

  const views: SQLViewDefinition[] = [];
  for (const [table, featureNames] of viewFeaturesByTable.entries()) {
    const sortedFeatures = sortKeys(Array.from(featureNames), (name) => name);
    const selectParts: string[] = [];
    const groupByAliases: string[] = [];

    for (const featureName of sortedFeatures) {
      const feature = ensureFeatureExists(featureName, featureMap);
      const policy = policies.get(featureName);
      const columnAlias = feature.name;
      const isGroupBy = groupByFeatures.has(featureName);
      if (policy?.redaction?.type === 'remove') {
        continue;
      }
      if (isGroupBy) {
        selectParts.push(buildColumnExpression(feature, policy, columnAlias));
        groupByAliases.push(`"${columnAlias}"`);
      }
    }

    const aggregateParts: string[] = [];
    const metricsForTable = task.metrics.filter((metric) => {
      const { aggregator } = metric;
      if (aggregator.type === 'count') {
        const groupTables = new Set(
          (aggregator.groupBy ?? []).map((groupFeature) => featureMap.get(groupFeature)?.table),
        );
        return groupTables.size === 0 || (groupTables.size === 1 && groupTables.has(table));
      }
      if (aggregator.feature) {
        const feature = featureMap.get(aggregator.feature);
        return feature?.table === table;
      }
      return false;
    });

    for (const metric of sortKeys(metricsForTable, (m) => m.name)) {
      const aggregator = metric.aggregator;
      const featureName = aggregator.feature;
      if (featureName) {
        const feature = featureMap.get(featureName);
        if (feature && feature.table === table) {
          const policy = policies.get(featureName);
          const valueExpression = applyRedactionSql(
            applyCoarseningSql(`${feature.table}.${feature.column}`, policy?.coarsening),
            policy?.redaction,
          );
          if (aggregator.type === 'sum') {
            aggregateParts.push(`  SUM(${valueExpression}) AS "${metric.name}"`);
          } else if (aggregator.type === 'avg') {
            aggregateParts.push(`  AVG(${valueExpression}) AS "${metric.name}"`);
          } else if (aggregator.type === 'countDistinct') {
            aggregateParts.push(`  COUNT(DISTINCT ${valueExpression}) AS "${metric.name}"`);
          }
        }
      }
      if (aggregator.type === 'count' && aggregator.groupBy && aggregator.groupBy.length >= 0) {
        aggregateParts.push(`  COUNT(*) AS "${metric.name}"`);
      }
    }

    const allSelectParts = [
      ...selectParts.map((expr) => `  ${expr}`),
      ...aggregateParts,
    ];

    const viewName = `${sanitizeIdentifier(task.name)}_${sanitizeIdentifier(table)}_minimal_view`;
    const sqlParts = [
      `CREATE OR REPLACE VIEW ${viewName} AS`,
      'SELECT',
      allSelectParts.join('\n'),
      `FROM ${table}`,
    ];
    if (groupByAliases.length > 0) {
      sqlParts.push(`GROUP BY ${groupByAliases.join(', ')}`);
    }

    views.push({
      name: viewName,
      table,
      description: `Minimal view for task ${task.name} on table ${table}`,
      sql: sqlParts.join('\n'),
    });
  }

  const baselineRows = task.fixture.baselineRows;
  const processedBaseline = computeProcessedRows(baselineRows, featureMap, new Map(), requiredFeatures);
  const processedMinimal = computeProcessedRows(baselineRows, featureMap, policies, requiredFeatures);

  const accuracyReport: MetricAccuracy[] = task.metrics.map((metric) => {
    const baselineAggregation = computeMetricAggregation(processedBaseline, metric);
    const minimalAggregation = computeMetricAggregation(processedMinimal, metric);
    const accuracy = computeMetricAccuracy(baselineAggregation, minimalAggregation);
    return {
      metric: metric.name,
      baseline: baselineAggregation,
      minimalView: minimalAggregation,
      accuracy,
      meetsTarget: accuracy >= metric.targetAccuracy,
    };
  });

  const redactionMap: Record<string, RedactionDecision> = {};
  for (const feature of task.features) {
    const policy = policies.get(feature.name);
    const droppedByRequirement = !requiredFeatures.has(feature.name);
    const included = requiredFeatures.has(feature.name) && policy?.redaction?.type !== 'remove';
    redactionMap[feature.name] = buildRedactionDecision(feature, policy, included, droppedByRequirement);
  }

  const baselineExposure: ExposureSummary = {
    fields: task.features.length,
    rows: baselineRows.length,
  };

  const minimalExposure = computeExposureSummary(
    baselineRows,
    featureMap,
    policies,
    requiredFeatures,
    groupByFeatures,
  );

  const fieldDelta: ImpactDelta = {
    absolute: baselineExposure.fields - minimalExposure.fields,
    percent:
      baselineExposure.fields === 0
        ? 0
        : (baselineExposure.fields - minimalExposure.fields) / baselineExposure.fields,
  };
  const rowDelta: ImpactDelta = {
    absolute: baselineExposure.rows - minimalExposure.rows,
    percent:
      baselineExposure.rows === 0
        ? 0
        : (baselineExposure.rows - minimalExposure.rows) / baselineExposure.rows,
  };

  const impactSummary: ImpactSummary = {
    baseline: baselineExposure,
    minimal: minimalExposure,
    fieldDelta,
    rowDelta,
  };

  const simulator: ImpactSimulator = {
    ...impactSummary,
    run: (rows: Record<string, unknown>[]) => {
      const summary = computeExposureSummary(rows, featureMap, policies, requiredFeatures, groupByFeatures);
      const deltaFields = baselineExposure.fields - summary.fields;
      const deltaRows = baselineExposure.rows - summary.rows;
      return {
        baseline: baselineExposure,
        minimal: summary,
        fieldDelta: {
          absolute: deltaFields,
          percent: baselineExposure.fields === 0 ? 0 : deltaFields / baselineExposure.fields,
        },
        rowDelta: {
          absolute: deltaRows,
          percent: baselineExposure.rows === 0 ? 0 : deltaRows / baselineExposure.rows,
        },
      };
    },
  };

  return {
    views: sortKeys(views, (view) => view.name),
    redactionMap,
    accuracyReport,
    impactSimulator: simulator,
  };
}
