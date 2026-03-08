package state

import "context"

// Minimal durable store API used by new Postgres-backed implementation (scaffold).
// This is intentionally small for PR1; it will grow as we wire the orchestrator to use it.

type Run struct {
	ID             string         `json:"id"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	Status         string         `json:"status"`
	Payload        map[string]any `json:"payload,omitempty"`
	Result         map[string]any `json:"result,omitempty"`
	Owner          string         `json:"owner,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
	CreatedAt      string         `json:"created_at,omitempty"`
	UpdatedAt      string         `json:"updated_at,omitempty"`
}

type Event struct {
	ID             string         `json:"id"`
	RunID          string         `json:"run_id,omitempty"`
	TaskID         string         `json:"task_id,omitempty"`
	EventType      string         `json:"event_type"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	Payload        map[string]any `json:"payload,omitempty"`
	CreatedAt      string         `json:"created_at,omitempty"`
}

// StoreAPI is the minimal interface the rest of the system can use to interact
// with a durable store. This is intentionally narrow for the first PR.
type StoreAPI interface {
	// CreateRun creates a new run in an idempotent fashion.
	// If idempotencyKey is empty the store will create a new run each call.
	CreateRun(ctx context.Context, idempotencyKey, actor string, payload map[string]any) (*Run, error)

	// GetRun returns a run by id.
	GetRun(ctx context.Context, id string) (*Run, error)

	// AppendEvent appends an event (append-only). Idempotency handled via idempotencyKey.
	AppendEvent(ctx context.Context, evt Event) (*Event, error)

	// ListEvents returns events for a run ordered by created_at ascending.
	ListEvents(ctx context.Context, runID string) ([]Event, error)

	// Close releases resources.
	Close() error
}
