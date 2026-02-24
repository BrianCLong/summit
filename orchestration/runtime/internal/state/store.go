package state

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/summit/orchestration/runtime/internal/model"
)

// Store persists workflow state and telemetry events.
type Store struct {
	db     *sql.DB
	mu     sync.RWMutex
	runs   map[string]*model.Status
	events map[string][]RunEvent
}

// RunEvent captures activity execution metadata.
type RunEvent struct {
	Type      string         `json:"type"`
	NodeID    string         `json:"nodeId"`
	Channel   string         `json:"channel"`
	Payload   map[string]any `json:"payload,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
}

// OpenPostgres opens a Postgres-backed store. If dsn is empty the store operates in-memory.
func OpenPostgres(ctx context.Context, dsn string) (*Store, error) {
	if dsn == "" {
		return NewInMemoryStore(), nil
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	store := &Store{db: db, runs: make(map[string]*model.Status), events: make(map[string][]RunEvent)}
	if err := store.ensureSchema(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

// NewInMemoryStore returns a store that keeps data in process memory.
func NewInMemoryStore() *Store {
	return &Store{
		runs:   make(map[string]*model.Status),
		events: make(map[string][]RunEvent),
	}
}

// Close closes the underlying database if present.
func (s *Store) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

func (s *Store) ensureSchema(ctx context.Context) error {
	if s.db == nil {
		return nil
	}
	stmts := []string{
		`create table if not exists chronos_runs (
      run_id text primary key,
      actor text not null,
      state text not null,
      current text not null,
      tags jsonb,
      updated_at timestamptz not null default now()
    )`,
		`create table if not exists chronos_events (
      id bigserial primary key,
      run_id text not null references chronos_runs(run_id) on delete cascade,
      node_id text not null,
      event_type text not null,
      channel text not null,
      payload jsonb,
      created_at timestamptz not null default now()
    )`,
	}
	for _, stmt := range stmts {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// BeginRun registers a new workflow run.
func (s *Store) BeginRun(ctx context.Context, runID, actor string, tags map[string]string, ir model.IRDag, inputs map[string]any) error {
	status := &model.Status{
		RunID:   runID,
		State:   "Running",
		Current: "",
		Updated: time.Now().UTC(),
		Tags:    tags,
	}

	s.mu.Lock()
	s.runs[runID] = status
	s.events[runID] = append(s.events[runID], RunEvent{Type: "begin", Timestamp: time.Now().UTC(), Payload: map[string]any{
		"actor":     actor,
		"namespace": ir.Namespace,
		"workflow":  ir.Name,
		"specHash":  ir.SpecHash,
		"inputs":    inputs,
	}})
	s.mu.Unlock()

	if s.db == nil {
		return nil
	}

	tagsJSON, err := json.Marshal(tags)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
    insert into chronos_runs (run_id, actor, state, current, tags)
    values ($1, $2, $3, $4, $5)
    on conflict (run_id) do update set state = excluded.state, updated_at = now()
  `, runID, actor, "Running", "", tagsJSON)
	return err
}

// MarkCurrent updates the active node for a run.
func (s *Store) MarkCurrent(ctx context.Context, runID, node string) error {
	s.mu.Lock()
	status, ok := s.runs[runID]
	if !ok {
		status = &model.Status{RunID: runID}
		s.runs[runID] = status
	}
	status.Current = node
	status.Updated = time.Now().UTC()
	s.mu.Unlock()

	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `update chronos_runs set current = $2, updated_at = now() where run_id = $1`, runID, node)
	return err
}

// RecordHTTPCall stores metadata for an HTTP activity.
func (s *Store) RecordHTTPCall(ctx context.Context, runID string, node model.Node, method string) error {
	payload := map[string]any{
		"with":   node.With,
		"method": method,
	}
	return s.recordEvent(ctx, runID, node.ID, "activity", "http", payload)
}

// RecordKafkaPublish stores metadata for a Kafka publish activity.
func (s *Store) RecordKafkaPublish(ctx context.Context, runID string, node model.Node) error {
	payload := map[string]any{
		"with": node.With,
	}
	return s.recordEvent(ctx, runID, node.ID, "activity", "kafka", payload)
}

// RecordNoop records a deterministic no-op activity.
func (s *Store) RecordNoop(ctx context.Context, runID string, node model.Node) error {
	payload := map[string]any{"uses": node.Uses}
	return s.recordEvent(ctx, runID, node.ID, "activity", "noop", payload)
}

func (s *Store) recordEvent(ctx context.Context, runID, nodeID, eventType, channel string, payload map[string]any) error {
	event := RunEvent{
		Type:      eventType,
		NodeID:    nodeID,
		Channel:   channel,
		Payload:   payload,
		Timestamp: time.Now().UTC(),
	}

	s.mu.Lock()
	s.events[runID] = append(s.events[runID], event)
	s.mu.Unlock()

	if s.db == nil {
		return nil
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
    insert into chronos_events (run_id, node_id, event_type, channel, payload)
    values ($1, $2, $3, $4, $5)
  `, runID, nodeID, eventType, channel, payloadJSON)
	return err
}

// Succeed marks a run as successful.
func (s *Store) Succeed(ctx context.Context, runID string) error {
	s.mu.Lock()
	status, ok := s.runs[runID]
	if !ok {
		s.mu.Unlock()
		return errors.New("run not found")
	}
	status.State = "Succeeded"
	status.Current = ""
	status.Updated = time.Now().UTC()
	s.mu.Unlock()

	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `update chronos_runs set state = 'Succeeded', current = '', updated_at = now() where run_id = $1`, runID)
	return err
}

// Fail marks a run as failed with a message stored as the current field for quick diagnostics.
func (s *Store) Fail(ctx context.Context, runID, message string) error {
	s.mu.Lock()
	status, ok := s.runs[runID]
	if !ok {
		status = &model.Status{RunID: runID}
		s.runs[runID] = status
	}
	status.State = "Failed"
	status.Current = message
	status.Updated = time.Now().UTC()
	s.mu.Unlock()

	if s.db == nil {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `update chronos_runs set state = 'Failed', current = $2, updated_at = now() where run_id = $1`, runID, message)
	return err
}

// Status fetches the current status for a run.
func (s *Store) Status(ctx context.Context, runID string) (*model.Status, error) {
	s.mu.RLock()
	status, ok := s.runs[runID]
	s.mu.RUnlock()
	if ok {
		copy := *status
		return &copy, nil
	}

	if s.db == nil {
		return nil, errors.New("run not found")
	}

	row := s.db.QueryRowContext(ctx, `select run_id, state, current, updated_at, coalesce(tags, '{}'::jsonb) from chronos_runs where run_id = $1`, runID)
	var fetched model.Status
	var tagsJSON []byte
	if err := row.Scan(&fetched.RunID, &fetched.State, &fetched.Current, &fetched.Updated, &tagsJSON); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("run not found")
		}
		return nil, err
	}
	if len(tagsJSON) > 0 {
		_ = json.Unmarshal(tagsJSON, &fetched.Tags)
	}

	s.mu.Lock()
	s.runs[runID] = &fetched
	s.mu.Unlock()

	return &fetched, nil
}

// Events returns recorded activity events for the run.
func (s *Store) Events(runID string) []RunEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snapshot := make([]RunEvent, len(s.events[runID]))
	copy(snapshot, s.events[runID])
	return snapshot
}
