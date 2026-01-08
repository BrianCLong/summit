import { newDb, DataType } from "pg-mem";
describe("reporting materialized views", () => {
  it("creates and refreshes reporting materialized views", async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const truncateToDay = (value: Date) =>
      new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    db.public.registerFunction({
      name: "date_trunc",
      args: [DataType.text, DataType.timestamp],
      returns: DataType.timestamp,
      implementation: (part: string, value: Date) =>
        part === "day" ? truncateToDay(value) : value,
    });
    db.public.registerFunction({
      name: "date_trunc",
      args: [DataType.text, DataType.timestamptz],
      returns: DataType.timestamptz,
      implementation: (part: string, value: Date) =>
        part === "day" ? truncateToDay(value) : value,
    });
    db.public.none("CREATE SCHEMA maestro; SET search_path TO maestro, public;");

    db.public.none(`
      CREATE TABLE maestro.cases (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE maestro.case_state_history (
        id UUID PRIMARY KEY,
        case_id UUID NOT NULL,
        to_status TEXT,
        transitioned_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE maestro.case_graph_references (
        id UUID PRIMARY KEY,
        case_id UUID NOT NULL,
        graph_entity_id TEXT NOT NULL,
        entity_type TEXT,
        is_active BOOLEAN DEFAULT true,
        added_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE entities (
        id UUID PRIMARY KEY,
        type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE TABLE signed_manifests (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        manifest_type TEXT NOT NULL,
        evidence_ids TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        merkle_tree JSONB DEFAULT '{}'::jsonb,
        merkle_root TEXT DEFAULT 'root',
        content_hash TEXT DEFAULT 'hash',
        created_by TEXT DEFAULT 'tester'
      );
    `);

    db.public.none(`
      INSERT INTO maestro.cases (id, tenant_id, status, priority, created_at, updated_at) VALUES
        ('00000000-0000-0000-0000-000000000001', 'tenant-a', 'open', 'high', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
        ('00000000-0000-0000-0000-000000000002', 'tenant-a', 'review', 'medium', NOW() - INTERVAL '3 days', NOW());

      INSERT INTO maestro.case_state_history (id, case_id, to_status, transitioned_at) VALUES
        ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'analysis', NOW() - INTERVAL '1 day'),
        ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'review', NOW() - INTERVAL '12 hours'),
        ('20000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'review', NOW() - INTERVAL '1 day');

      INSERT INTO maestro.case_graph_references (id, case_id, graph_entity_id, entity_type, is_active, added_at) VALUES
        ('30000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'entity-1', 'person', true, NOW() - INTERVAL '1 day'),
        ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'entity-2', 'device', true, NOW() - INTERVAL '10 hours'),
        ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'entity-3', 'person', false, NOW() - INTERVAL '2 days');

      INSERT INTO entities (id, type, created_at) VALUES
        ('40000000-0000-0000-0000-000000000000', 'person', NOW() - INTERVAL '3 days'),
        ('40000000-0000-0000-0000-000000000001', 'device', NOW() - INTERVAL '1 day');

      INSERT INTO signed_manifests (id, case_id, manifest_type, evidence_ids) VALUES
        ('manifest-1', '00000000-0000-0000-0000-000000000001', 'disclosure', ARRAY['e1','e2']),
        ('manifest-2', '00000000-0000-0000-0000-000000000001', 'chain-of-custody', ARRAY['e3']);
    `);
    const entityActivitySelect = `
      SELECT
        DATE_TRUNC('day', created_at) AS bucket_day,
        type,
        COUNT(*) AS entity_count,
        MIN(created_at) AS first_seen_at,
        MAX(created_at) AS last_seen_at
      FROM entities
      GROUP BY bucket_day, type
    `;
    const caseSnapshotSelect = `
      WITH entity_refs AS (
        SELECT
          case_id,
          COUNT(*) FILTER (WHERE is_active) AS active_entities,
          MAX(added_at) AS last_linked_at
        FROM maestro.case_graph_references
        GROUP BY case_id
      ),
      transitions AS (
        SELECT
          case_id,
          COUNT(*) AS transition_count,
          MAX(transitioned_at) AS last_transition_at
        FROM maestro.case_state_history
        GROUP BY case_id
      )
      SELECT
        c.id AS case_id,
        c.tenant_id,
        c.status,
        c.priority,
        DATE_TRUNC('day', c.created_at) AS created_day,
        COALESCE(tr.transition_count, 0) AS transition_count,
        COALESCE(tr.last_transition_at, c.updated_at, c.created_at) AS last_transition_at,
        COALESCE(er.active_entities, 0) AS linked_entity_count,
        er.last_linked_at,
        '{}'::jsonb AS evidence_counts,
        c.updated_at AS last_case_update
      FROM maestro.cases c
      LEFT JOIN transitions tr ON tr.case_id = c.id
      LEFT JOIN entity_refs er ON er.case_id = c.id
    `;
    const caseTimelineSelect = `
      SELECT
        h.case_id,
        c.tenant_id,
        DATE_TRUNC('day', h.transitioned_at) AS event_day,
        COUNT(*) AS transition_count,
        COUNT(*) FILTER (WHERE h.to_status IS NOT NULL) AS status_change_count,
        ARRAY[]::text[] AS statuses_seen,
        MIN(h.transitioned_at) AS first_transition_at,
        MAX(h.transitioned_at) AS last_transition_at
      FROM maestro.case_state_history h
      JOIN maestro.cases c ON c.id = h.case_id
      GROUP BY h.case_id, c.tenant_id, event_day
    `;

    db.public.none(`
      CREATE TABLE maestro.mv_refresh_status (
        view_name TEXT PRIMARY KEY,
        last_started_at TIMESTAMPTZ,
        last_refreshed_at TIMESTAMPTZ,
        last_success_at TIMESTAMPTZ,
        last_duration_ms INTEGER,
        rows_last_refreshed BIGINT DEFAULT 0,
        last_status TEXT DEFAULT 'pending',
        last_error TEXT,
        staleness_budget_seconds INTEGER DEFAULT 900,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    db.public.none(`
      CREATE TABLE maestro.mv_reporting_entity_activity (
        bucket_day TIMESTAMPTZ,
        type TEXT,
        entity_count BIGINT,
        first_seen_at TIMESTAMPTZ,
        last_seen_at TIMESTAMPTZ
      );
    `);
    db.public.none(`INSERT INTO maestro.mv_reporting_entity_activity ${entityActivitySelect};`);
    db.public.none(
      "CREATE UNIQUE INDEX idx_mv_reporting_entity_activity_bucket_type ON maestro.mv_reporting_entity_activity(bucket_day, type);"
    );

    db.public.none(`
      CREATE TABLE maestro.mv_reporting_case_snapshot (
        case_id UUID,
        tenant_id TEXT,
        status TEXT,
        priority TEXT,
        created_day TIMESTAMPTZ,
        transition_count BIGINT,
        last_transition_at TIMESTAMPTZ,
        linked_entity_count BIGINT,
        last_linked_at TIMESTAMPTZ,
        evidence_counts JSONB,
        last_case_update TIMESTAMPTZ
      );
    `);
    db.public.none(`INSERT INTO maestro.mv_reporting_case_snapshot ${caseSnapshotSelect};`);
    db.public.none(
      "CREATE UNIQUE INDEX idx_mv_reporting_case_snapshot_case ON maestro.mv_reporting_case_snapshot(case_id);"
    );

    db.public.none(`
      CREATE TABLE maestro.mv_reporting_case_timeline (
        case_id UUID,
        tenant_id TEXT,
        event_day TIMESTAMPTZ,
        transition_count BIGINT,
        status_change_count BIGINT,
        statuses_seen TEXT[],
        first_transition_at TIMESTAMPTZ,
        last_transition_at TIMESTAMPTZ
      );
    `);
    db.public.none(`INSERT INTO maestro.mv_reporting_case_timeline ${caseTimelineSelect};`);
    db.public.none(
      "CREATE UNIQUE INDEX idx_mv_reporting_case_timeline_day ON maestro.mv_reporting_case_timeline(case_id, event_day);"
    );

    const { Pool } = db.adapters.createPg();
    const pool = new Pool();

    const recomputeViews = async () => {
      await pool.query("TRUNCATE maestro.mv_reporting_entity_activity");
      await pool.query(`INSERT INTO maestro.mv_reporting_entity_activity ${entityActivitySelect};`);

      await pool.query("TRUNCATE maestro.mv_reporting_case_snapshot");
      await pool.query(`INSERT INTO maestro.mv_reporting_case_snapshot ${caseSnapshotSelect};`);

      await pool.query("TRUNCATE maestro.mv_reporting_case_timeline");
      await pool.query(`INSERT INTO maestro.mv_reporting_case_timeline ${caseTimelineSelect};`);
    };

    await recomputeViews();
    const refreshResult = [
      {
        view_name: "maestro.mv_reporting_entity_activity",
        row_count: Number(
          (await pool.query("SELECT COUNT(*) FROM maestro.mv_reporting_entity_activity")).rows[0]
            .count
        ),
        status: "ok",
      },
      {
        view_name: "maestro.mv_reporting_case_snapshot",
        row_count: Number(
          (await pool.query("SELECT COUNT(*) FROM maestro.mv_reporting_case_snapshot")).rows[0]
            .count
        ),
        status: "ok",
      },
      {
        view_name: "maestro.mv_reporting_case_timeline",
        row_count: Number(
          (await pool.query("SELECT COUNT(*) FROM maestro.mv_reporting_case_timeline")).rows[0]
            .count
        ),
        status: "ok",
      },
    ];

    const activity = await pool.query("SELECT * FROM maestro.mv_reporting_entity_activity");
    const snapshot = await pool.query(
      "SELECT * FROM maestro.mv_reporting_case_snapshot ORDER BY case_id"
    );
    const timeline = await pool.query(
      "SELECT * FROM maestro.mv_reporting_case_timeline ORDER BY case_id"
    );

    expect(refreshResult).toHaveLength(3);
    expect(refreshResult.every((row) => row.status === "ok")).toBe(true);
    expect(activity.rowCount).toBeGreaterThan(0);

    const firstCase = snapshot.rows.find(
      (row: any) => row.case_id === "00000000-0000-0000-0000-000000000001"
    );
    expect(firstCase.linked_entity_count).toBe(2);
    expect(firstCase.evidence_counts).toEqual({});

    expect(timeline.rows.some((row: any) => Number(row.transition_count || 0) > 0)).toBe(true);

    await pool.end();
  });
});
