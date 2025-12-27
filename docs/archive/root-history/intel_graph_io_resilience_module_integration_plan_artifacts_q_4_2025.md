# IntelGraph IO Resilience Module — Integration Plan & Artifacts (Q4‑2025)

> Adds the user‑provided **IO Resilience Living Playbook**, red‑team program, dashboards, and a turnkey deployment kit to IntelGraph’s current IO tools. This doc is the implementation bridge: scope → code → migrations → dashboards → Jira → microsite. Keep as the working source of truth for the integration PR.

---

## 1) Scope & Deliverables

**What we’re adding**

- **Playbook & Runbooks:** “IO Resilience Living Playbook — Q4 2025” (+ red‑team calendar). Versioned under `docs/io/`.
- **Data model:** Postgres tables `IOEvents`, `IOActions`, `IOMedia`; Story‑ID canon.
- **GraphQL API:** Queries/Mutations for IO cases, actions, clusters, KPIs.
- **Pipelines & detectors:** URL similarity scoring, voice‑clone triage, clusterer (embeddings + HDBSCAN), C2PA verifier.
- **Dashboards:** TTD/TTM, Narrative Map, Takedown Status.
- **Jira wiring:** Issue types, workflow, SLAs, auto‑escalation YAML.
- **Microsite:** `/verify` page and Debunk Cards (HTML + React component).
- **Seeds:** CSV demo datasets to light up dashboards immediately.

**Repo layout** (proposed)

```
apps/web/src/features/io/            # UI (React) components + jQuery hooks
server/graphql/io/                   # Schema + resolvers
server/services/io/                  # Detectors, clusterer, C2PA, takedown templates
server/db/migrations/                # SQL migrations
docs/io/                             # Playbook, runbooks, SOPs
ops/jira/io/                         # Workflow + SLAs YAML/JSON
public/verify/                       # Static microsite (optional)
```

**Branch & PR**

- Branch: `feature/io-resilience-module`
- PR gates: migrations applied; unit + integration tests pass; dashboards render with seeds; `/verify` builds.

---

## 2) Database Migrations (Postgres)

Use these as `server/db/migrations/20250925_io_resilience.sql`.

```sql
CREATE TABLE IF NOT EXISTS IOEvents (
  id UUID PRIMARY KEY,
  observed_at TIMESTAMPTZ NOT NULL,
  platform TEXT,
  locale TEXT,
  topic TEXT,
  story_id TEXT,
  detector TEXT,
  confidence NUMERIC,
  severity INTEGER,
  reach_estimate INTEGER,
  url TEXT,
  account_handle TEXT,
  cluster_id TEXT,
  is_authority_impersonation BOOLEAN DEFAULT FALSE,
  is_synthetic_media BOOLEAN DEFAULT FALSE,
  jurisdiction TEXT,
  raw_ref TEXT
);

CREATE TABLE IF NOT EXISTS IOActions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES IOEvents(id),
  action_type TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  provider TEXT,
  ticket_id TEXT,
  outcome TEXT
);

CREATE TABLE IF NOT EXISTS IOMedia (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES IOEvents(id),
  media_type TEXT,
  sha256 TEXT,
  c2pa_present BOOLEAN,
  provenance_score NUMERIC
);
```

**Story‑ID canon** → `docs/io/story_ids.yaml`

```yaml
- Election-Process-Suppression/Voice-Clone/Call-Back-CTA
- Disaster-Authority-Blame/Agency-Incompetence
- Finance-Fake-Exec/Deepfake-Video
- Geopolitics-Ukraine/Legitimacy-Narratives
- Geopolitics-Taiwan/Deterrence-Failure
- Middle-East/Humanitarian-Obstruction-Claims
```

---

## 3) GraphQL API (Apollo Server)

**Schema** → `server/graphql/io/schema.graphql`

```graphql
scalar DateTime

type IOEvent {
  id: ID!
  observed_at: DateTime!
  platform: String
  locale: String
  topic: String
  story_id: String
  detector: String
  confidence: Float
  severity: Int
  reach_estimate: Int
  url: String
  account_handle: String
  cluster_id: String
  is_authority_impersonation: Boolean
  is_synthetic_media: Boolean
  jurisdiction: String
  raw_ref: String
  media: [IOMedia!]!
  actions: [IOAction!]!
}

type IOAction {
  id: ID!
  event_id: ID!
  action_type: String
  initiated_at: DateTime
  completed_at: DateTime
  status: String
  provider: String
  ticket_id: String
  outcome: String
}

type IOMedia {
  id: ID!
  event_id: ID!
  media_type: String
  sha256: String
  c2pa_present: Boolean
  provenance_score: Float
}

type TTDTTMPoint {
  bucket: DateTime!
  median_ttd: Int!
  median_ttm: Int!
}

type TakedownAging {
  provider: String!
  queued: Int!
  sent: Int!
  ack: Int!
  complete: Int!
  oldest_outstanding: String
}

type ClusterRollup {
  cluster_id: String!
  topic: String
  items: Int!
  actors: Int!
  reach: Int!
  avg_sev: Float
  first_seen: DateTime
  last_seen: DateTime
}

type Query {
  ioEvent(id: ID!): IOEvent
  ioEvents(
    limit: Int = 100
    topic: String
    story_id: String
    severityGte: Int
  ): [IOEvent!]!
  ioTTDTTM(hours: Int = 24): [TTDTTMPoint!]!
  ioTakedownAging: [TakedownAging!]!
  ioClusterRollup(hours: Int = 72): [ClusterRollup!]!
}

input NewIOEventInput {
  observed_at: DateTime!
  platform: String
  locale: String
  topic: String
  story_id: String
  detector: String
  confidence: Float
  severity: Int
  reach_estimate: Int
  url: String
  account_handle: String
  cluster_id: String
  is_authority_impersonation: Boolean
  is_synthetic_media: Boolean
  jurisdiction: String
  raw_ref: String
}

input NewIOActionInput {
  event_id: ID!
  action_type: String!
  initiated_at: DateTime
  provider: String
  ticket_id: String
}

type Mutation {
  createIOEvent(input: NewIOEventInput!): IOEvent!
  createIOAction(input: NewIOActionInput!): IOAction!
  completeIOAction(id: ID!): IOAction!
}
```

**Resolver outline** → `server/graphql/io/resolvers.ts`

```ts
import { sql } from '../../db';
export const resolvers = {
  Query: {
    ioEvent: async (_: any, { id }) =>
      (await sql`SELECT * FROM "IOEvents" WHERE id = ${id}`)[0],
    ioEvents: async (_: any, args) => {
      const { limit = 100, topic, story_id, severityGte } = args;
      return await sql`
        SELECT * FROM "IOEvents"
        WHERE (${topic} IS NULL OR topic=${topic})
          AND (${story_id} IS NULL OR story_id=${story_id})
          AND (${severityGte} IS NULL OR severity >= ${severityGte})
        ORDER BY observed_at DESC
        LIMIT ${limit}`;
    },
    ioTTDTTM: async (_: any, { hours = 24 }) =>
      await sql`
      WITH times AS (
        SELECT e.id,
               MIN(e.observed_at) AS first_observed,
               MIN(a.initiated_at) FILTER (WHERE a.action_type IS NOT NULL) AS first_triage,
               MIN(a.completed_at) FILTER (WHERE a.status = 'complete') AS containment
        FROM "IOEvents" e
        LEFT JOIN "IOActions" a ON a.event_id = e.id
        WHERE e.observed_at >= NOW() - (${hours} || ' hours')::interval
        GROUP BY e.id)
      SELECT date_trunc('hour', first_observed) AS bucket,
             EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY (first_triage - first_observed)))::int/60 AS median_ttd,
             EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY (containment - first_triage)))::int/60 AS median_ttm
      FROM times
      WHERE first_triage IS NOT NULL AND containment IS NOT NULL
      GROUP BY 1
      ORDER BY 1;`,
    ioTakedownAging: async () =>
      await sql`
      SELECT provider,
             COUNT(*) FILTER (WHERE status = 'queued') AS queued,
             COUNT(*) FILTER (WHERE status = 'sent') AS sent,
             COUNT(*) FILTER (WHERE status = 'acknowledged') AS ack,
             COUNT(*) FILTER (WHERE status = 'complete') AS complete,
             MAX(NOW() - initiated_at) FILTER (WHERE status IN ('queued','sent')) AS oldest_outstanding
      FROM "IOActions"
      GROUP BY provider
      ORDER BY complete DESC;`,
    ioClusterRollup: async (_: any, { hours = 72 }) =>
      await sql`
      SELECT cluster_id, topic,
             COUNT(*) AS items,
             COUNT(DISTINCT account_handle) AS actors,
             SUM(reach_estimate) AS reach,
             AVG(severity) AS avg_sev,
             MIN(observed_at) AS first_seen,
             MAX(observed_at) AS last_seen
      FROM "IOEvents"
      WHERE observed_at >= NOW() - (${hours} || ' hours')::interval
      GROUP BY 1,2
      ORDER BY reach DESC;`,
  },
  IOEvent: {
    media: async (e: any) =>
      await sql`SELECT * FROM "IOMedia" WHERE event_id=${e.id}`,
    actions: async (e: any) =>
      await sql`SELECT * FROM "IOActions" WHERE event_id=${e.id} ORDER BY initiated_at ASC`,
  },
  Mutation: {
    createIOEvent: async (_: any, { input }) =>
      (
        await sql`
      INSERT INTO "IOEvents" ${sql(input)} RETURNING *`
      )[0],
    createIOAction: async (_: any, { input }) =>
      (
        await sql`
      INSERT INTO "IOActions" ${sql(input)} RETURNING *`
      )[0],
    completeIOAction: async (_: any, { id }) =>
      (
        await sql`
      UPDATE "IOActions" SET status='complete', completed_at=NOW() WHERE id=${id} RETURNING *`
      )[0],
  },
};
```

---

## 4) Detectors & Pipelines (minimal viable stack)

**URL/Domain similarity** → `server/services/io/urlSimilarity.ts`

```ts
import levenshtein from 'fast-levenshtein';
const homoglyphs = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '5': 's',
  '@': 'a',
  '¡': 'i',
};
export function normalizeHost(h: string) {
  return h
    .toLowerCase()
    .replace(/[\u00A1@015]/g, (c) => (homoglyphs as any)[c] || c);
}
export function similarity(a: string, b: string) {
  const na = normalizeHost(a),
    nb = normalizeHost(b);
  const d = levenshtein.get(na, nb);
  const m = Math.max(na.length, nb.length);
  return 1 - d / m;
}
export function isLookalike(
  candidate: string,
  canon: string,
  threshold = 0.82,
) {
  try {
    return similarity(candidate, canon) >= threshold;
  } catch {
    return false;
  }
}
```

**Voice/face synthetic triage stub** → `server/services/io/synthTriage.ts`

```ts
export type MediaTriage = {
  isSyntheticLikely: boolean;
  provenanceScore: number;
  notes?: string;
};
export async function triageAudio(buf: Buffer): Promise<MediaTriage> {
  // Ensemble placeholder — wire to real model later
  const hashEntropy = ([...buf].reduce((a, b) => a + (b % 7), 0) % 100) / 100;
  return {
    isSyntheticLikely: hashEntropy > 0.65,
    provenanceScore: 1 - hashEntropy,
  };
}
```

**Clusterer (embeddings + HDBSCAN)**

- Use existing embedding service; add `cluster_id` to events via hourly job.
- Store Story‑ID mapping rules in `docs/io/story_ids.yaml`.

**C2PA verifier**

- Integrate a library to parse C2PA manifests; on success set `c2pa_present=true` and compute `provenance_score`.

---

## 5) UI — Dashboards & Verify Microsite

**Dashboards**

- Implement TTD/TTM, Narrative Map, and Takedown Status with the provided SQL.
- Filters: topic, story_id, provider, severity, hours window.

**Verify Microsite**

- Place static HTML at `public/verify/index.html` (from kit) or add the React `VerifyUs` component at `apps/web/src/pages/verify.tsx`.

---

## 6) Jira — Workflow, SLAs, Automation

- Add YAML under `ops/jira/io/automation.yaml` (from kit) and SLA JSON `ops/jira/io/slas.json`.
- Create custom fields: Story ID, Cluster ID, Severity, Jurisdiction, TTD Minutes, TTM Minutes.
- Wire Slack channel `#io-warroom` in automation.

---

## 7) Seeds & Loading

**Files (committed to `/mnt/data` during setup)**

- `/mnt/data/IOEvents_seed.csv` (220 rows)
- `/mnt/data/IOActions_seed.csv` (187 rows)
- `/mnt/data/IOMedia_seed.csv` (57 rows)

**Load (psql)**

```sql
\copy IOEvents  FROM '/mnt/data/IOEvents_seed.csv'  CSV HEADER;
\copy IOActions FROM '/mnt/data/IOActions_seed.csv' CSV HEADER;
\copy IOMedia   FROM '/mnt/data/IOMedia_seed.csv'   CSV HEADER;
```

---

## 8) Security & Governance Hooks

- ABAC/RBAC: restrict Mutations to `role:intel` or `role:trustsafety`; Legal required to set `status=complete` for `LE_referral` actions.
- Audit: log detector version/thresholds per alert; immutable case timelines.
- Guardrails: two‑source confirmation for elections/disaster claims; escalation trees for Comms/Legal/SecOps.

---

## 9) Test Plan

- **DB**: migration idempotence; FK integrity; cascade behavior (none by default).
- **API**: unit tests for resolvers; input validation & SQL injection protections.
- **Detectors**: URL look‑alike thresholds; synthetic triage stub contracts.
- **Dashboards**: query performance (p95 < 1s on seed data).
- **Microsite**: build/link checks; content signatures visible.
- **Jira**: rule dry‑run; SLA timers render; Slack notifications fire.

---

## 10) Runbooks & Red‑Team Calendar

- Embed the full **IO Resilience Living Playbook — Q4 2025** and **Deployment Kit** as `docs/io/playbook.md` and `docs/io/deploy_kit.md`.
- Schedule the quarterly exercises via the calendar in the playbook; record TTD/TTM & Rₙarr outcomes.

---

## 11) Rollout Checklist

- [ ] Apply migrations in `dev` → `stage` → `prod`.
- [ ] Import seeds; verify dashboards render.
- [ ] Deploy `/verify` microsite; publish PGP fingerprint in DNS TXT.
- [ ] Connect Jira project; import automation & SLAs; map custom fields.
- [ ] Enable detectors behind feature flags; tune thresholds; add on‑call runbook.
- [ ] Run Exercise A & B; capture baseline TTD/TTM and gaps; file remediation tickets.

---

## 12) Notes

- All code is open‑source friendly (MIT). No proprietary dependencies were introduced in the stubs above.
- Next iteration: wire real audio/vision models, add registrar/telco provider adapters, and integrate C2PA parsing.
