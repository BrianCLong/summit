package pgstore

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"

	"github.com/summit/orchestration/runtime/internal/state"
)

var tracer = otel.Tracer("orchestration.store.pgstore")

type PGStore struct {
	db *sql.DB
}

// New creates a new PGStore. dsn example: "postgres://postgres:secret@localhost:5432/postgres?sslmode=disable"
func New(ctx context.Context, dsn string) (*PGStore, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("open pg: %w", err)
	}
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(5)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping pg: %w", err)
	}
	return &PGStore{db: db}, nil
}

func (p *PGStore) Close() error {
	if p.db != nil {
		return p.db.Close()
	}
	return nil
}

// CreateRun inserts a run in an idempotent way using idempotency_key uniqueness.
// Returns the created or existing run row.
func (p *PGStore) CreateRun(ctx context.Context, idempotencyKey, actor string, payload map[string]any) (*state.Run, error) {
	ctx, span := tracer.Start(ctx, "PGStore.CreateRun")
	defer span.End()

	span.SetAttributes(attribute.String("idempotency_key", idempotencyKey), attribute.String("actor", actor))
	var payloadJSON []byte
	var err error
	if payload != nil {
		payloadJSON, err = json.Marshal(payload)
		if err != nil {
			span.RecordError(err)
			return nil, err
		}
	}

	// Generate an id for the run (we will return the DB value if insert conflicts)
	newID := uuid.New().String()

	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	var createdID string
	insertSQL := `
INSERT INTO orchestrator_runs (id, idempotency_key, status, payload, created_at, updated_at)
VALUES ($1, NULLIF($2, ''), 'PENDING', $3, now(), now())
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, status, payload, created_at, updated_at;
`
	row := tx.QueryRowContext(ctx, insertSQL, newID, idempotencyKey, payloadJSON)
	var status string
	var dbPayload []byte
	var createdAt, updatedAt sql.NullTime
	if err = row.Scan(&createdID, &status, &dbPayload, &createdAt, &updatedAt); err != nil {
		if err == sql.ErrNoRows {
			// The insert was skipped due to existing idempotency_key; fetch existing
			selectSQL := `SELECT id, status, payload, created_at, updated_at FROM orchestrator_runs WHERE idempotency_key = $1`
			err = tx.QueryRowContext(ctx, selectSQL, idempotencyKey).Scan(&createdID, &status, &dbPayload, &createdAt, &updatedAt)
			if err != nil {
				span.RecordError(err)
				return nil, err
			}
		} else {
			span.RecordError(err)
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		span.RecordError(err)
		return nil, err
	}

	// Build the Run return value
	var payloadMap map[string]any
	if len(dbPayload) > 0 {
		_ = json.Unmarshal(dbPayload, &payloadMap)
	}

	span.SetAttributes(attribute.String("run.id", createdID))
	log.Printf("store: CreateRun result run_id=%s idempotency_key=%s", createdID, idempotencyKey)

	return &state.Run{
		ID:             createdID,
		IdempotencyKey: idempotencyKey,
		Status:         status,
		Payload:        payloadMap,
		CreatedAt:      createdAt.Time.String(),
		UpdatedAt:      updatedAt.Time.String(),
	}, nil
}

func (p *PGStore) GetRun(ctx context.Context, id string) (*state.Run, error) {
	ctx, span := tracer.Start(ctx, "PGStore.GetRun")
	defer span.End()
	span.SetAttributes(attribute.String("run.id", id))

	var status string
	var dbPayload []byte
	var createdAt, updatedAt sql.NullTime
	query := `SELECT id, status, payload, created_at, updated_at FROM orchestrator_runs WHERE id = $1`
	row := p.db.QueryRowContext(ctx, query, id)
	var outID string
	if err := row.Scan(&outID, &status, &dbPayload, &createdAt, &updatedAt); err != nil {
		return nil, err
	}

	var payloadMap map[string]any
	if len(dbPayload) > 0 {
		_ = json.Unmarshal(dbPayload, &payloadMap)
	}

	return &state.Run{
		ID:        outID,
		Status:    status,
		Payload:   payloadMap,
		CreatedAt: createdAt.Time.String(),
		UpdatedAt: updatedAt.Time.String(),
	}, nil
}

func (p *PGStore) AppendEvent(ctx context.Context, evt state.Event) (*state.Event, error) {
	ctx, span := tracer.Start(ctx, "PGStore.AppendEvent")
	defer span.End()
	span.SetAttributes(attribute.String("run.id", evt.RunID), attribute.String("event.type", evt.EventType))

	payloadJSON, _ := json.Marshal(evt.Payload)
	id := uuid.New().String()

	query := `
INSERT INTO orchestrator_events (id, run_id, task_id, event_type, idempotency_key, payload, created_at)
VALUES ($1,$2,$3,$4,NULLIF($5,''),$6, now())
ON CONFLICT (run_id, idempotency_key) DO NOTHING
RETURNING id, created_at;
`
	var createdAt sql.NullTime
	row := p.db.QueryRowContext(ctx, query, id, nullString(evt.RunID), nullString(evt.TaskID), evt.EventType, evt.IdempotencyKey, payloadJSON)
	if err := row.Scan(&id, &createdAt); err != nil {
		if err == sql.ErrNoRows {
			// conflict happened: fetch existing by run_id + idempotency_key
			selectSQL := `SELECT id, created_at FROM orchestrator_events WHERE run_id = $1 AND idempotency_key = $2`
			if err := p.db.QueryRowContext(ctx, selectSQL, evt.RunID, evt.IdempotencyKey).Scan(&id, &createdAt); err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	evt.ID = id
	if createdAt.Valid {
		evt.CreatedAt = createdAt.Time.String()
	}
	log.Printf("store: AppendEvent run_id=%s event_id=%s type=%s", evt.RunID, evt.ID, evt.EventType)
	return &evt, nil
}

func (p *PGStore) ListEvents(ctx context.Context, runID string) ([]state.Event, error) {
	ctx, span := tracer.Start(ctx, "PGStore.ListEvents")
	defer span.End()
	span.SetAttributes(attribute.String("run.id", runID))

	query := `SELECT id, run_id, task_id, event_type, idempotency_key, payload, created_at FROM orchestrator_events WHERE run_id = $1 ORDER BY created_at ASC`
	rows, err := p.db.QueryContext(ctx, query, runID)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}
	defer rows.Close()

	out := make([]state.Event, 0)
	for rows.Next() {
		var e state.Event
		var payloadBytes []byte
		var createdAt sql.NullTime
		if err := rows.Scan(&e.ID, &e.RunID, &e.TaskID, &e.EventType, &e.IdempotencyKey, &payloadBytes, &createdAt); err != nil {
			return nil, err
		}
		if len(payloadBytes) > 0 {
			_ = json.Unmarshal(payloadBytes, &e.Payload)
		}
		if createdAt.Valid {
			e.CreatedAt = createdAt.Time.String()
		}
		out = append(out, e)
	}
	return out, nil
}

// helper: convert empty string to NULL acceptable for Query args
func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
