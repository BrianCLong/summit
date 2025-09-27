import { createHash } from 'crypto';

export interface ConsentGrant {
  granted: boolean;
  updatedAt?: Date;
}

export interface Subject {
  tenantId: string;
  subjectId: string;
  attributes?: Record<string, string>;
  consents?: Record<string, ConsentGrant>;
}

export interface VariantConfig {
  name: string;
  weight: number;
}

export interface StratumConfig {
  name: string;
  criteria: Record<string, string>;
  weights?: Record<string, number>;
}

export interface ExclusionRule {
  attribute: string;
  values: string[];
}

export interface ExperimentConfig {
  id: string;
  tenantId: string;
  purpose: string;
  variants: VariantConfig[];
  strata?: StratumConfig[];
  exclusions?: ExclusionRule[];
  stickinessKeys?: string[];
  powerTolerance?: number;
}

export interface Assignment {
  experimentId: string;
  tenantId: string;
  subjectId: string;
  variant: string;
  stratum: string;
  assignedAt: Date;
  reason: string;
}

export interface LedgerEntry {
  timestamp: Date;
  event: 'assigned' | 'rebalanced' | 'revoked';
  experimentId: string;
  tenantId: string;
  subjectId: string;
  variant?: string;
  stratum?: string;
  reason: string;
}

interface SubjectState {
  subject: Subject;
  hash: bigint;
  existing: boolean;
  existingVariant?: string;
}

function subjectKey(tenantId: string, subjectId: string): string {
  return `${tenantId}:${subjectId}`;
}

function assignmentKey(experimentId: string, tenantId: string, subjectId: string): string {
  return `${experimentId}|${subjectKey(tenantId, subjectId)}`;
}

function normalizeExperiment(exp: ExperimentConfig): ExperimentConfig {
  return {
    ...exp,
    stickinessKeys: exp.stickinessKeys ?? [],
    strata: exp.strata ?? [],
    exclusions: exp.exclusions ?? [],
    powerTolerance: exp.powerTolerance && exp.powerTolerance > 0 ? exp.powerTolerance : 0.05,
  };
}

export class ConsentAwareAllocator {
  private subjects = new Map<string, Subject>();
  private experiments = new Map<string, ExperimentConfig>();
  private assignments = new Map<string, Assignment>();
  private ledger: LedgerEntry[] = [];

  upsertSubject(subject: Subject): void {
    const normalized: Subject = {
      tenantId: subject.tenantId,
      subjectId: subject.subjectId,
      attributes: subject.attributes ?? {},
      consents: subject.consents ?? {},
    };
    const key = subjectKey(normalized.tenantId, normalized.subjectId);
    const previous = this.subjects.get(key);
    this.subjects.set(key, normalized);

    for (const experiment of this.experiments.values()) {
      if (experiment.tenantId !== normalized.tenantId) {
        continue;
      }
      const prevConsent = previous?.consents?.[experiment.purpose]?.granted ?? false;
      const newConsent = normalized.consents?.[experiment.purpose]?.granted ?? false;
      if (prevConsent !== newConsent) {
        this.rebalance(experiment.id).catch(() => {
          /* swallow errors; surfaced during explicit assign */
        });
      }
    }
  }

  removeSubject(tenantId: string, subjectId: string): void {
    const key = subjectKey(tenantId, subjectId);
    this.subjects.delete(key);
    for (const [assignKey, assignment] of [...this.assignments.entries()]) {
      if (assignment.tenantId === tenantId && assignment.subjectId === subjectId) {
        this.assignments.delete(assignKey);
        this.record({
          timestamp: new Date(),
          event: 'revoked',
          experimentId: assignment.experimentId,
          tenantId,
          subjectId,
          variant: assignment.variant,
          stratum: assignment.stratum,
          reason: 'subject removed',
        });
      }
    }
  }

  async assign(experimentConfig: ExperimentConfig, tenantId: string, subjectId: string): Promise<Assignment> {
    const experiment = normalizeExperiment(experimentConfig);
    this.experiments.set(experiment.id, experiment);

    const key = subjectKey(tenantId, subjectId);
    const subject = this.subjects.get(key);
    if (!subject) {
      throw new Error('subject not registered with allocator');
    }
    if (subject.tenantId !== experiment.tenantId) {
      throw new Error('tenant mismatch between subject and experiment');
    }

    await this.rebalance(experiment.id);

    const aKey = assignmentKey(experiment.id, tenantId, subjectId);
    const assignment = this.assignments.get(aKey);
    if (!assignment) {
      throw new Error('subject has not granted consent for purpose');
    }
    return assignment;
  }

  getLedger(): LedgerEntry[] {
    return [...this.ledger];
  }

  private async rebalance(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return;
    }

    const stratumSubjects = new Map<string, SubjectState[]>();

    for (const [key, assignment] of [...this.assignments.entries()]) {
      if (assignment.experimentId !== experimentId) {
        continue;
      }
      const subjKey = subjectKey(assignment.tenantId, assignment.subjectId);
      const subject = this.subjects.get(subjKey);
      if (!subject || subject.tenantId !== experiment.tenantId || !hasConsent(subject, experiment.purpose) || matchesExclusion(experiment.exclusions, subject)) {
        this.assignments.delete(key);
        this.record({
          timestamp: new Date(),
          event: 'revoked',
          experimentId,
          tenantId: assignment.tenantId,
          subjectId: assignment.subjectId,
          variant: assignment.variant,
          stratum: assignment.stratum,
          reason: subject ? 'consent or exclusion updated' : 'subject missing',
        });
      }
    }

    for (const subject of this.subjects.values()) {
      if (subject.tenantId !== experiment.tenantId) {
        continue;
      }
      if (!hasConsent(subject, experiment.purpose)) {
        continue;
      }
      if (matchesExclusion(experiment.exclusions, subject)) {
        continue;
      }
      const stratum = resolveStratum(experiment, subject);
      const hash = stableHash(experiment, stratum, subject);
      const key = assignmentKey(experimentId, subject.tenantId, subject.subjectId);
      const assignment = this.assignments.get(key);
      let existing = false;
      let existingVariant: string | undefined;
      if (assignment) {
        if (assignment.stratum !== stratum) {
          this.assignments.delete(key);
          this.record({
            timestamp: new Date(),
            event: 'rebalanced',
            experimentId,
            tenantId: subject.tenantId,
            subjectId: subject.subjectId,
            variant: assignment.variant,
            stratum: assignment.stratum,
            reason: 'stratum changed',
          });
        } else {
          existing = true;
          existingVariant = assignment.variant;
        }
      }
      const bucket = stratumSubjects.get(stratum) ?? [];
      bucket.push({ subject, hash, existing, existingVariant });
      stratumSubjects.set(stratum, bucket);
    }

    for (const [stratum, subjects] of stratumSubjects.entries()) {
      this.rebalanceStratum(experiment, stratum, subjects);
    }
  }

  private rebalanceStratum(experiment: ExperimentConfig, stratum: string, subjects: SubjectState[]): void {
    if (subjects.length === 0) {
      return;
    }

    const weights = weightMapForStratum(experiment, stratum);
    const targetCounts = computeTargetCounts(subjects.length, experiment.variants, weights);
    const currentCounts = new Map<string, number>();
    const assignmentsByVariant = new Map<string, SubjectState[]>();
    const unassigned: SubjectState[] = [];

    for (const state of subjects) {
      if (state.existing && state.existingVariant) {
        currentCounts.set(state.existingVariant, (currentCounts.get(state.existingVariant) ?? 0) + 1);
        const bucket = assignmentsByVariant.get(state.existingVariant) ?? [];
        bucket.push(state);
        assignmentsByVariant.set(state.existingVariant, bucket);
      } else {
        unassigned.push(state);
      }
    }

    unassigned.sort((a, b) => {
      if (a.hash === b.hash) {
        return a.subject.subjectId.localeCompare(b.subject.subjectId);
      }
      return a.hash < b.hash ? -1 : 1;
    });

    for (const state of unassigned) {
      const variant = nextVariantWithDeficit(experiment.variants, targetCounts, currentCounts);
      currentCounts.set(variant, (currentCounts.get(variant) ?? 0) + 1);
      const bucket = assignmentsByVariant.get(variant) ?? [];
      bucket.push({ ...state, existing: true, existingVariant: variant });
      assignmentsByVariant.set(variant, bucket);
      this.applyAssignment(experiment, variant, stratum, state.subject, 'assigned');
    }

    let iterationGuard = subjects.length * experiment.variants.length;
    while (iterationGuard > 0) {
      iterationGuard--;
      const { surplus, deficit } = findSurplusAndDeficit(experiment.variants, targetCounts, currentCounts);
      if (!surplus || !deficit) {
        break;
      }
      const candidates = assignmentsByVariant.get(surplus) ?? [];
      if (candidates.length === 0) {
        break;
      }
      candidates.sort((a, b) => {
        if (a.hash === b.hash) {
          return b.subject.subjectId.localeCompare(a.subject.subjectId);
        }
        return a.hash > b.hash ? -1 : 1;
      });
      const moving = candidates.shift()!;
      assignmentsByVariant.set(surplus, candidates);
      currentCounts.set(surplus, (currentCounts.get(surplus) ?? 1) - 1);
      currentCounts.set(deficit, (currentCounts.get(deficit) ?? 0) + 1);
      const bucket = assignmentsByVariant.get(deficit) ?? [];
      bucket.push({ ...moving, existingVariant: deficit });
      assignmentsByVariant.set(deficit, bucket);
      this.applyAssignment(experiment, deficit, stratum, moving.subject, 'rebalanced');
    }

    if (!withinTolerance(experiment, stratum, currentCounts)) {
      throw new Error(`rebalance tolerance exceeded for experiment ${experiment.id} stratum ${stratum}`);
    }
  }

  private applyAssignment(experiment: ExperimentConfig, variant: string, stratum: string, subject: Subject, event: LedgerEntry['event']): void {
    const key = assignmentKey(experiment.id, subject.tenantId, subject.subjectId);
    const previous = this.assignments.get(key);
    const assignment: Assignment = {
      experimentId: experiment.id,
      tenantId: subject.tenantId,
      subjectId: subject.subjectId,
      variant,
      stratum,
      assignedAt: new Date(),
      reason: event,
    };
    this.assignments.set(key, assignment);

    if (previous && previous.variant === variant && previous.stratum === stratum) {
      return;
    }

    let reason = event;
    if (previous && previous.variant !== variant) {
      reason = `variant updated via ${event}`;
    }
    if (previous && previous.stratum !== stratum) {
      reason = `stratum updated via ${event}`;
    }

    this.record({
      timestamp: assignment.assignedAt,
      event,
      experimentId: experiment.id,
      tenantId: subject.tenantId,
      subjectId: subject.subjectId,
      variant,
      stratum,
      reason,
    });
  }

  private record(entry: LedgerEntry): void {
    this.ledger.push(entry);
  }
}

function hasConsent(subject: Subject, purpose: string): boolean {
  return subject.consents?.[purpose]?.granted ?? false;
}

function matchesExclusion(rules: ExclusionRule[] | undefined, subject: Subject): boolean {
  if (!rules?.length) {
    return false;
  }
  return rules.some((rule) => {
    const value = subject.attributes?.[rule.attribute];
    return rule.values.some((candidate) => candidate.localeCompare(value ?? '', undefined, { sensitivity: 'accent' }) === 0);
  });
}

function resolveStratum(experiment: ExperimentConfig, subject: Subject): string {
  for (const stratum of experiment.strata ?? []) {
    const matches = Object.entries(stratum.criteria).every(([key, value]) => subject.attributes?.[key] === value);
    if (matches) {
      return stratum.name;
    }
  }
  return 'default';
}

function weightMapForStratum(experiment: ExperimentConfig, stratum: string): Map<string, number> {
  const weights = new Map<string, number>();
  for (const variant of experiment.variants) {
    weights.set(variant.name, variant.weight);
  }
  for (const s of experiment.strata ?? []) {
    if (s.name === stratum && s.weights) {
      for (const [name, weight] of Object.entries(s.weights)) {
        weights.set(name, weight);
      }
    }
  }
  for (const variant of experiment.variants) {
    const weight = weights.get(variant.name) ?? 0;
    if (weight <= 0) {
      throw new Error('experiment must define positive weights for variants');
    }
  }
  return weights;
}

function computeTargetCounts(total: number, variants: VariantConfig[], weights: Map<string, number>): Map<string, number> {
  let sumWeights = 0;
  for (const variant of variants) {
    sumWeights += weights.get(variant.name) ?? 0;
  }
  const counts = new Map<string, number>();
  const remainders: { name: string; fraction: number }[] = [];
  let assigned = 0;
  for (const variant of variants) {
    const expected = ((weights.get(variant.name) ?? 0) / sumWeights) * total;
    const base = Math.floor(expected);
    counts.set(variant.name, base);
    remainders.push({ name: variant.name, fraction: expected - base });
    assigned += base;
  }
  let remainder = total - assigned;
  if (remainder > 0) {
    remainders.sort((a, b) => {
      if (a.fraction === b.fraction) {
        return a.name.localeCompare(b.name);
      }
      return b.fraction - a.fraction;
    });
    for (let i = 0; i < remainder && i < remainders.length; i += 1) {
      counts.set(remainders[i].name, (counts.get(remainders[i].name) ?? 0) + 1);
    }
  }
  return counts;
}

function nextVariantWithDeficit(variants: VariantConfig[], target: Map<string, number>, current: Map<string, number>): string {
  const candidates = variants.map((variant) => ({
    name: variant.name,
    diff: (target.get(variant.name) ?? 0) - (current.get(variant.name) ?? 0),
  }));
  candidates.sort((a, b) => {
    if (a.diff === b.diff) {
      return a.name.localeCompare(b.name);
    }
    return b.diff - a.diff;
  });
  return candidates[0].name;
}

function findSurplusAndDeficit(variants: VariantConfig[], target: Map<string, number>, current: Map<string, number>): { surplus?: string; deficit?: string } {
  let surplusName: string | undefined;
  let surplusDiff = 0;
  let deficitName: string | undefined;
  let deficitDiff = 0;
  for (const variant of variants) {
    const diff = (current.get(variant.name) ?? 0) - (target.get(variant.name) ?? 0);
    if (diff > surplusDiff) {
      surplusDiff = diff;
      surplusName = variant.name;
    }
    if (-diff > deficitDiff) {
      deficitDiff = -diff;
      deficitName = variant.name;
    }
  }
  if (surplusDiff > 0 && deficitDiff > 0) {
    return { surplus: surplusName, deficit: deficitName };
  }
  return {};
}

function withinTolerance(experiment: ExperimentConfig, stratum: string, current: Map<string, number>): boolean {
  let total = 0;
  for (const count of current.values()) {
    total += count;
  }
  if (total === 0) {
    return true;
  }
  const weights = weightMapForStratum(experiment, stratum);
  let sumWeights = 0;
  for (const variant of experiment.variants) {
    sumWeights += weights.get(variant.name) ?? 0;
  }
  if (sumWeights === 0) {
    sumWeights = experiment.variants.length;
  }
  const tolerance = experiment.powerTolerance ?? 0.05;
  const sampleAllowance = 1 / total;
  const allowed = sampleAllowance > tolerance ? sampleAllowance : tolerance;
  for (const variant of experiment.variants) {
    const expected = (weights.get(variant.name) ?? 0) / sumWeights;
    const actual = (current.get(variant.name) ?? 0) / total;
    if (Math.abs(expected - actual) > allowed + 1e-9) {
      return false;
    }
  }
  return true;
}

function stableHash(experiment: ExperimentConfig, stratum: string, subject: Subject): bigint {
  const stickinessValues = (experiment.stickinessKeys ?? []).map((key) => subject.attributes?.[key] ?? '');
  const payload = [
    experiment.id,
    experiment.purpose,
    stratum,
    subject.tenantId,
    subject.subjectId,
    stickinessValues.join('|'),
  ].join('|');
  const digest = createHash('sha256').update(payload).digest();
  return digest.readBigUInt64BE(0);
}
