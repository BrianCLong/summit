import { randomUUID } from 'node:crypto';
import { pg } from '../db/pg';
import { isKnownStoryId } from '../services/io/storyIds';
import { computeRiskSignals, type RiskComputationResult } from '../services/io/riskScoring';
import { computeProvenanceHealth } from '../services/io/provenanceLedger';

type Nullable<T> = T | null | undefined;

interface IOEventsArgs {
  limit?: number;
  topic?: Nullable<string>;
  story_id?: Nullable<string>;
  severityGte?: Nullable<number>;
  threatVector?: Nullable<string>;
}

interface TimeWindowArgs {
  hours?: number;
  story_id?: Nullable<string>;
  cluster_id?: Nullable<string>;
}

interface NewIOEventInput {
  observed_at: string;
  platform?: Nullable<string>;
  locale?: Nullable<string>;
  topic?: Nullable<string>;
  story_id?: Nullable<string>;
  detector?: Nullable<string>;
  confidence?: Nullable<number>;
  severity?: Nullable<number>;
  reach_estimate?: Nullable<number>;
  url?: Nullable<string>;
  account_handle?: Nullable<string>;
  cluster_id?: Nullable<string>;
  is_authority_impersonation?: Nullable<boolean>;
  is_synthetic_media?: Nullable<boolean>;
  jurisdiction?: Nullable<string>;
  raw_ref?: Nullable<string>;
  threat_vector?: Nullable<string>;
  risk_score?: Nullable<number>;
  anomaly_score?: Nullable<number>;
  forecast_horizon_minutes?: Nullable<number>;
  predicted_reach?: Nullable<number>;
  provenance_confidence?: Nullable<number>;
}

interface NewIOActionInput {
  event_id: string;
  action_type: string;
  initiated_at?: Nullable<string>;
  provider?: Nullable<string>;
  ticket_id?: Nullable<string>;
  outcome?: Nullable<string>;
}

interface NewIOForecastInput {
  cluster_id?: Nullable<string>;
  story_id?: Nullable<string>;
  horizon_minutes: number;
  predicted_risk?: Nullable<number>;
  predicted_reach?: Nullable<number>;
  confidence_interval?: Nullable<number>;
  model_version?: Nullable<string>;
  generated_at?: Nullable<string>;
  valid_from: string;
  valid_to?: Nullable<string>;
  rationale?: Nullable<string>;
}

interface NewIOProvenanceInput {
  event_id: string;
  source?: Nullable<string>;
  assertion_type?: Nullable<string>;
  verified?: Nullable<boolean>;
  verified_by?: Nullable<string>;
  verified_at?: Nullable<string>;
  signature_hash?: Nullable<string>;
  c2pa_manifest_url?: Nullable<string>;
  score?: Nullable<number>;
  notes?: Nullable<string>;
}

function clampHours(hours?: number): number {
  if (!hours || Number.isNaN(hours)) {
    return 24;
  }
  return Math.min(Math.max(Math.floor(hours), 1), 720);
}

function buildEventFilters(args: IOEventsArgs): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (args.topic) {
    conditions.push(`topic = $${index}`);
    values.push(args.topic);
    index += 1;
  }

  if (args.story_id) {
    conditions.push(`story_id = $${index}`);
    values.push(args.story_id);
    index += 1;
  }

  if (typeof args.severityGte === 'number') {
    conditions.push(`severity >= $${index}`);
    values.push(args.severityGte);
    index += 1;
  }

  if (args.threatVector) {
    conditions.push(`threat_vector = $${index}`);
    values.push(args.threatVector);
    index += 1;
  }

  if (!conditions.length) {
    return { clause: '', values };
  }

  return { clause: `WHERE ${conditions.join(' AND ')}`, values };
}

function buildRiskSignals(input: NewIOEventInput, storyId: Nullable<string>) {
  const anomalyIndicators = [
    { weight: 0.6, score: (input.confidence ?? 0.5) - 0.5 },
    { weight: 0.4, score: (input.severity ?? 0) / 5 }
  ];
  return computeRiskSignals({
    severity: input.severity ?? null,
    reach_estimate: input.reach_estimate ?? null,
    confidence: input.confidence ?? null,
    is_authority_impersonation: input.is_authority_impersonation ?? null,
    is_synthetic_media: input.is_synthetic_media ?? null,
    detector: input.detector ?? null,
    story_id: storyId ?? undefined,
    anomalyIndicators
  });
}

function coalesceRisk(input: NewIOEventInput, computed: ReturnType<typeof computeRiskSignals>) {
  return {
    riskScore: input.risk_score ?? computed.riskScore,
    anomalyScore: input.anomaly_score ?? computed.anomalyScore,
    forecastHorizon: input.forecast_horizon_minutes ?? computed.forecastHorizonMinutes,
    predictedReach: input.predicted_reach ?? computed.predictedReach,
    provenanceConfidence: input.provenance_confidence ?? computed.provenanceConfidence
  };
}

export const ioResilienceResolvers = {
  Query: {
    async ioEvent(_: unknown, { id }: { id: string }) {
      return pg.oneOrNone('SELECT * FROM io_events WHERE id = $1', [id]);
    },
    async ioEvents(_: unknown, args: IOEventsArgs) {
      const { clause, values } = buildEventFilters(args);
      const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
      values.push(limit);
      const limitPlaceholder = `$${values.length}`;
      const sql = `SELECT * FROM io_events ${clause} ORDER BY observed_at DESC LIMIT ${limitPlaceholder}`;
      return pg.readMany(sql, values);
    },
    async ioTTDTTM(_: unknown, args: TimeWindowArgs) {
      const windowHours = clampHours(args.hours);
      return pg.readMany(
        `
          WITH times AS (
            SELECT e.id,
                   MIN(e.observed_at) AS first_observed,
                   MIN(a.initiated_at) FILTER (WHERE a.action_type IS NOT NULL) AS first_triage,
                   MIN(a.completed_at) FILTER (WHERE a.status = 'complete') AS containment
            FROM io_events e
            LEFT JOIN io_actions a ON a.event_id = e.id
            WHERE e.observed_at >= NOW() - ($1 || ' hours')::interval
            GROUP BY e.id
          )
          SELECT date_trunc('hour', first_observed) AS bucket,
                 COALESCE(
                   FLOOR(EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY (first_triage - first_observed))) / 60),
                   0
                 ) AS median_ttd,
                 COALESCE(
                   FLOOR(EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY (containment - first_triage))) / 60),
                   0
                 ) AS median_ttm
          FROM times
          WHERE first_triage IS NOT NULL AND containment IS NOT NULL
          ORDER BY bucket
        `,
        [windowHours]
      );
    },
    async ioTakedownAging() {
      return pg.readMany(
        `
          SELECT provider,
                 COUNT(*) FILTER (WHERE status = 'queued') AS queued,
                 COUNT(*) FILTER (WHERE status = 'sent') AS sent,
                 COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged,
                 COUNT(*) FILTER (WHERE status = 'complete') AS complete,
                 MAX(NOW() - initiated_at) FILTER (WHERE status IN ('queued','sent')) AS oldest_outstanding
          FROM io_actions
          GROUP BY provider
          ORDER BY complete DESC NULLS LAST, provider
        `
      );
    },
    async ioClusterRollup(_: unknown, args: TimeWindowArgs) {
      const windowHours = clampHours(args.hours);
      return pg.readMany(
        `
          SELECT cluster_id,
                 topic,
                 COUNT(*) AS items,
                 COUNT(DISTINCT account_handle) AS actors,
                 COALESCE(SUM(reach_estimate), 0) AS reach,
                 AVG(severity)::float AS avg_severity,
                 MIN(observed_at) AS first_seen,
                 MAX(observed_at) AS last_seen
          FROM io_events
          WHERE observed_at >= NOW() - ($1 || ' hours')::interval
          GROUP BY cluster_id, topic
          ORDER BY reach DESC, items DESC
        `,
        [windowHours]
      );
    },
    async ioForecasts(_: unknown, args: TimeWindowArgs) {
      const windowHours = clampHours(args.hours);
      return pg.readMany(
        `
          SELECT *,
                 COALESCE(valid_to, valid_from + (horizon_minutes || ' minutes')::interval) AS expires_at
          FROM io_forecasts
          WHERE generated_at >= NOW() - ($1 || ' hours')::interval
            AND ($2::text IS NULL OR story_id = $2)
            AND ($3::text IS NULL OR cluster_id = $3)
          ORDER BY generated_at DESC
        `,
        [windowHours, args.story_id ?? null, args.cluster_id ?? null]
      );
    },
    async ioRiskOutlook(_: unknown, args: TimeWindowArgs) {
      const windowHours = clampHours(args.hours);
      return pg.readMany(
        `
          WITH scoped AS (
            SELECT story_id,
                   horizon_minutes,
                   predicted_risk,
                   predicted_reach,
                   confidence_interval,
                   model_version,
                   generated_at,
                   COALESCE(valid_to, valid_from + (horizon_minutes || ' minutes')::interval) AS expires_at
            FROM io_forecasts
            WHERE generated_at >= NOW() - ($1 || ' hours')::interval
              AND ($2::text IS NULL OR story_id = $2)
          )
          SELECT story_id,
                 MAX(horizon_minutes) AS horizon_minutes,
                 AVG(predicted_risk)::float AS predicted_risk,
                 AVG(predicted_reach)::float AS predicted_reach,
                 AVG(confidence_interval)::float AS confidence_interval,
                 MAX(model_version) AS model_version,
                 MAX(generated_at) AS generated_at,
                 MAX(expires_at) AS expires_at
          FROM scoped
          GROUP BY story_id
          ORDER BY predicted_risk DESC NULLS LAST, generated_at DESC
        `,
        [windowHours, args.story_id ?? null]
      );
    },
    async ioProvenanceCoverage(_: unknown, args: TimeWindowArgs) {
      const windowHours = clampHours(args.hours);
      const events = await pg.readMany(
        `
          SELECT id, story_id, COALESCE(risk_score, 0) AS risk_score, COALESCE(anomaly_score, 0) AS anomaly_score
          FROM io_events
          WHERE observed_at >= NOW() - ($1 || ' hours')::interval
            AND ($2::text IS NULL OR story_id = $2)
        `,
        [windowHours, args.story_id ?? null]
      );

      if (!events.length) {
        return [];
      }

      const eventIds = events.map((event) => event.id);
      const provenanceRows = await pg.readMany(
        `
          SELECT id, event_id, verified, score, verified_at
          FROM io_provenance_assertions
          WHERE event_id = ANY($1::uuid[])
        `,
        [eventIds]
      );

      const grouped = new Map<string | null, { events: typeof events; signals: typeof provenanceRows }>();
      const eventStoryMap = new Map(events.map((event) => [event.id, event.story_id ?? null] as const));
      events.forEach((event) => {
        if (!grouped.has(event.story_id)) {
          grouped.set(event.story_id, { events: [], signals: [] });
        }
        grouped.get(event.story_id)!.events.push(event);
      });

      provenanceRows.forEach((row) => {
        const storyId = eventStoryMap.get(row.event_id) ?? null;
        if (!grouped.has(storyId)) {
          grouped.set(storyId, { events: [], signals: [] });
        }
        grouped.get(storyId)!.signals.push(row);
      });

      return Array.from(grouped.entries()).map(([storyId, data]) => {
        const riskAggregate: RiskComputationResult = {
          riskScore:
            data.events.length === 0
              ? 0
              : data.events.reduce((acc, event) => acc + Number(event.risk_score ?? 0), 0) / data.events.length,
          anomalyScore:
            data.events.length === 0
              ? 0
              : data.events.reduce((acc, event) => acc + Number(event.anomaly_score ?? 0), 0) / data.events.length,
          forecastHorizonMinutes: 0,
          predictedReach: 0,
          provenanceConfidence: 0
        };

        const health = computeProvenanceHealth(
          data.signals.map((signal) => ({
            id: signal.id,
            verified: Boolean(signal.verified),
            score: signal.score,
            verified_at: signal.verified_at
          })),
          riskAggregate
        );

        return {
          story_id: storyId,
          verified_count: health.verifiedCount,
          pending_count: health.pendingCount,
          average_score: health.averageScore,
          last_verified_at: health.lastVerifiedAt,
          gap_flag: health.gapFlag
        };
      });
    }
  },
  Mutation: {
    async createIOEvent(_: unknown, { input }: { input: NewIOEventInput }) {
      const id = randomUUID();
      const storyId = input.story_id && isKnownStoryId(input.story_id) ? input.story_id : input.story_id ?? null;
      const computedSignals = buildRiskSignals(input, storyId);
      const risk = coalesceRisk(input, computedSignals);
      const row = await pg.write(
        `
          INSERT INTO io_events (
            id,
            observed_at,
            platform,
            locale,
            topic,
            story_id,
            detector,
            confidence,
            severity,
            reach_estimate,
            url,
            account_handle,
            cluster_id,
            is_authority_impersonation,
            is_synthetic_media,
            jurisdiction,
            raw_ref,
            threat_vector,
            risk_score,
            anomaly_score,
            forecast_horizon_minutes,
            predicted_reach,
            provenance_confidence
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
          )
          RETURNING *
        `,
        [
          id,
          input.observed_at,
          input.platform ?? null,
          input.locale ?? null,
          input.topic ?? null,
          storyId,
          input.detector ?? null,
          input.confidence ?? null,
          input.severity ?? null,
          input.reach_estimate ?? null,
          input.url ?? null,
          input.account_handle ?? null,
          input.cluster_id ?? null,
          input.is_authority_impersonation ?? false,
          input.is_synthetic_media ?? false,
          input.jurisdiction ?? null,
          input.raw_ref ?? null,
          input.threat_vector ?? null,
          risk.riskScore,
          risk.anomalyScore,
          risk.forecastHorizon,
          risk.predictedReach,
          risk.provenanceConfidence
        ]
      );
      return row;
    },
    async createIOAction(_: unknown, { input }: { input: NewIOActionInput }) {
      const id = randomUUID();
      const initiatedAt = input.initiated_at ?? new Date().toISOString();
      const row = await pg.write(
        `
          INSERT INTO io_actions (
            id,
            event_id,
            action_type,
            initiated_at,
            status,
            provider,
            ticket_id,
            outcome
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8
          )
          RETURNING *
        `,
        [
          id,
          input.event_id,
          input.action_type,
          initiatedAt,
          'queued',
          input.provider ?? null,
          input.ticket_id ?? null,
          input.outcome ?? null
        ]
      );
      return row;
    },
    async completeIOAction(_: unknown, { id }: { id: string }) {
      return pg.write(
        `
          UPDATE io_actions
          SET status = 'complete',
              completed_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [id]
      );
    },
    async createIOForecast(_: unknown, { input }: { input: NewIOForecastInput }) {
      const id = randomUUID();
      return pg.write(
        `
          INSERT INTO io_forecasts (
            id,
            cluster_id,
            story_id,
            horizon_minutes,
            predicted_risk,
            predicted_reach,
            confidence_interval,
            model_version,
            generated_at,
            valid_from,
            valid_to,
            rationale
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
          )
          RETURNING *
        `,
        [
          id,
          input.cluster_id ?? null,
          input.story_id ?? null,
          input.horizon_minutes,
          input.predicted_risk ?? null,
          input.predicted_reach ?? null,
          input.confidence_interval ?? null,
          input.model_version ?? null,
          input.generated_at ?? new Date().toISOString(),
          input.valid_from,
          input.valid_to ?? null,
          input.rationale ?? null
        ]
      );
    },
    async createIOProvenanceAssertion(_: unknown, { input }: { input: NewIOProvenanceInput }) {
      const id = randomUUID();
      return pg.write(
        `
          INSERT INTO io_provenance_assertions (
            id,
            event_id,
            source,
            assertion_type,
            verified,
            verified_by,
            verified_at,
            signature_hash,
            c2pa_manifest_url,
            score,
            notes
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
          )
          RETURNING *
        `,
        [
          id,
          input.event_id,
          input.source ?? null,
          input.assertion_type ?? null,
          input.verified ?? false,
          input.verified_by ?? null,
          input.verified_at ?? null,
          input.signature_hash ?? null,
          input.c2pa_manifest_url ?? null,
          input.score ?? null,
          input.notes ?? null
        ]
      );
    }
  },
  IOEvent: {
    actions(parent: { id: string }) {
      return pg.readMany(
        'SELECT * FROM io_actions WHERE event_id = $1 ORDER BY initiated_at ASC NULLS LAST',
        [parent.id]
      );
    },
    media(parent: { id: string }) {
      return pg.readMany('SELECT * FROM io_media WHERE event_id = $1 ORDER BY media_type', [parent.id]);
    },
    provenance(parent: { id: string }) {
      return pg.readMany(
        'SELECT * FROM io_provenance_assertions WHERE event_id = $1 ORDER BY verified DESC, verified_at DESC NULLS LAST',
        [parent.id]
      );
    },
    forecasts(parent: { cluster_id?: string | null; story_id?: string | null }) {
      return pg.readMany(
        `
          SELECT *,
                 COALESCE(valid_to, valid_from + (horizon_minutes || ' minutes')::interval) AS expires_at
          FROM io_forecasts
          WHERE ($1::text IS NULL OR cluster_id = $1)
            AND ($2::text IS NULL OR story_id = $2)
          ORDER BY generated_at DESC
          LIMIT 5
        `,
        [parent.cluster_id ?? null, parent.story_id ?? null]
      );
    }
  }
};

export default ioResilienceResolvers;
