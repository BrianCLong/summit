package etcwe

import (
	"errors"
	"sort"
	"sync"
	"time"
)

// Policy defines the temporal governance rules the operator enforces.
type Policy struct {
	// WindowSize is the duration of each tumbling window. Must be > 0.
	WindowSize time.Duration
	// AllowedLateness specifies how long after the nominal window end
	// retroactive corrections are accepted before events are quarantined.
	AllowedLateness time.Duration
}

// Validate ensures the policy is well formed.
func (p Policy) Validate() error {
	if p.WindowSize <= 0 {
		return errors.New("window size must be > 0")
	}
	if p.AllowedLateness < 0 {
		return errors.New("allowed lateness must be >= 0")
	}
	return nil
}

// Event represents an incoming governance event governed by event-time semantics.
type Event struct {
	ID             string
	Key            string
	EventTime      time.Time
	ProcessingTime time.Time
	Value          float64
}

// DecisionKind indicates why a decision emission occurred.
type DecisionKind string

const (
	// DecisionKindInitial marks the first emission for a window.
	DecisionKindInitial DecisionKind = "initial"
	// DecisionKindCorrection marks an emission caused by a late event inside the allowed lateness.
	DecisionKindCorrection DecisionKind = "correction"
	// DecisionKindFinalized marks the terminal emission when a window closes on watermark.
	DecisionKindFinalized DecisionKind = "finalized"
)

// Decision captures a governance output that reflects the latest event-time state.
type Decision struct {
	Key         string
	WindowStart time.Time
	WindowEnd   time.Time
	Version     int
	Kind        DecisionKind
	Value       float64
	EventIDs    []string
	EmittedAt   time.Time
	LateBy      time.Duration
	Final       bool
}

// AuditAction provides the purpose of the compliance record.
type AuditAction string

const (
	AuditActionDecision    AuditAction = "decision"
	AuditActionCorrection  AuditAction = "correction"
	AuditActionFinalized   AuditAction = "finalized"
	AuditActionQuarantined AuditAction = "quarantined"
)

// AuditRecord documents the reconciliation between event-time and decision-time.
type AuditRecord struct {
	Key             string
	WindowStart     time.Time
	WindowEnd       time.Time
	DecisionVersion int
	Action          AuditAction
	EventID         string
	EventTime       time.Time
	DecisionTime    time.Time
	Lateness        time.Duration
	Note            string
}

// Result bundles the emitted decision updates, compliance records, and quarantined events.
type Result struct {
	Decisions   []Decision
	Audits      []AuditRecord
	Quarantined []Event
}

// Operator enforces the event-time compliance policy.
type Operator struct {
	mu        sync.Mutex
	policy    Policy
	watermark time.Time
	windows   map[windowKey]*windowState
}

// NewOperator builds an operator with the supplied policy rules.
func NewOperator(policy Policy) (*Operator, error) {
	if err := policy.Validate(); err != nil {
		return nil, err
	}
	return &Operator{
		policy:  policy,
		windows: make(map[windowKey]*windowState),
	}, nil
}

type windowKey struct {
	Key   string
	Start time.Time
}

type windowState struct {
	key          windowKey
	end          time.Time
	events       map[string]Event
	sum          float64
	version      int
	maxEventTime time.Time
}

func newWindowState(key windowKey, end time.Time) *windowState {
	return &windowState{
		key:    key,
		end:    end,
		events: make(map[string]Event),
	}
}

// ProcessEvent ingests an event, emitting decisions, corrections, and audits as needed.
func (op *Operator) ProcessEvent(evt Event) Result {
	op.mu.Lock()
	defer op.mu.Unlock()

	var result Result

	if evt.Key == "" {
		result.Audits = append(result.Audits, AuditRecord{
			Action:       AuditActionQuarantined,
			Note:         "missing key",
			DecisionTime: nowUTC(),
		})
		result.Quarantined = append(result.Quarantined, evt)
		return result
	}

	if evt.ID == "" {
		result.Audits = append(result.Audits, AuditRecord{
			Key:          evt.Key,
			Action:       AuditActionQuarantined,
			Note:         "missing event id",
			DecisionTime: nowUTC(),
		})
		result.Quarantined = append(result.Quarantined, evt)
		return result
	}

	if evt.ProcessingTime.IsZero() {
		evt.ProcessingTime = nowUTC()
	}

	if !op.watermark.IsZero() && evt.EventTime.Add(op.policy.AllowedLateness).Before(op.watermark) {
		result.Quarantined = append(result.Quarantined, evt)
		result.Audits = append(result.Audits, AuditRecord{
			Key:          evt.Key,
			WindowStart:  evt.EventTime.Truncate(op.policy.WindowSize),
			WindowEnd:    evt.EventTime.Truncate(op.policy.WindowSize).Add(op.policy.WindowSize),
			Action:       AuditActionQuarantined,
			EventID:      evt.ID,
			EventTime:    evt.EventTime,
			DecisionTime: evt.ProcessingTime,
			Lateness:     op.watermark.Sub(evt.EventTime),
			Note:         "exceeded allowed lateness",
		})
		return result
	}

	start := evt.EventTime.Truncate(op.policy.WindowSize)
	end := start.Add(op.policy.WindowSize)
	key := windowKey{Key: evt.Key, Start: start}

	state, ok := op.windows[key]
	if !ok {
		state = newWindowState(key, end)
		op.windows[key] = state
	}

	// Update aggregate deterministically.
	if existing, exists := state.events[evt.ID]; exists {
		state.sum -= existing.Value
	}
	state.events[evt.ID] = evt
	state.sum += evt.Value

	if evt.EventTime.After(state.maxEventTime) {
		state.maxEventTime = evt.EventTime
	}

	state.version++

	kind := DecisionKindInitial
	action := AuditActionDecision
	if state.version > 1 {
		kind = DecisionKindCorrection
		action = AuditActionCorrection
	}

	eventIDs := sortedKeys(state.events)

	decision := Decision{
		Key:         evt.Key,
		WindowStart: start,
		WindowEnd:   end,
		Version:     state.version,
		Kind:        kind,
		Value:       state.sum,
		EventIDs:    eventIDs,
		EmittedAt:   evt.ProcessingTime,
		LateBy:      evt.ProcessingTime.Sub(evt.EventTime),
		Final:       false,
	}
	result.Decisions = append(result.Decisions, decision)

	result.Audits = append(result.Audits, AuditRecord{
		Key:             evt.Key,
		WindowStart:     start,
		WindowEnd:       end,
		DecisionVersion: state.version,
		Action:          action,
		EventID:         evt.ID,
		EventTime:       evt.EventTime,
		DecisionTime:    evt.ProcessingTime,
		Lateness:        evt.ProcessingTime.Sub(evt.EventTime),
		Note:            noteForAction(action),
	})

	return result
}

// AdvanceWatermark advances the watermark and finalizes windows that fall behind it.
func (op *Operator) AdvanceWatermark(mark time.Time) Result {
	op.mu.Lock()
	defer op.mu.Unlock()

	var result Result
	if !mark.After(op.watermark) {
		return result
	}

	op.watermark = mark

	for key, state := range op.windows {
		closeTime := state.end.Add(op.policy.AllowedLateness)
		if closeTime.After(op.watermark) {
			continue
		}

		eventIDs := sortedKeys(state.events)
		emittedAt := op.watermark
		latestEvent := state.maxEventTime
		if latestEvent.IsZero() {
			latestEvent = state.key.Start
		}

		decision := Decision{
			Key:         key.Key,
			WindowStart: key.Start,
			WindowEnd:   state.end,
			Version:     state.version,
			Kind:        DecisionKindFinalized,
			Value:       state.sum,
			EventIDs:    eventIDs,
			EmittedAt:   emittedAt,
			LateBy:      emittedAt.Sub(latestEvent),
			Final:       true,
		}
		result.Decisions = append(result.Decisions, decision)

		result.Audits = append(result.Audits, AuditRecord{
			Key:             key.Key,
			WindowStart:     key.Start,
			WindowEnd:       state.end,
			DecisionVersion: state.version,
			Action:          AuditActionFinalized,
			DecisionTime:    emittedAt,
			EventTime:       latestEvent,
			Lateness:        emittedAt.Sub(latestEvent),
			Note:            "window finalized on watermark",
		})

		delete(op.windows, key)
	}

	return result
}

func sortedKeys[T comparable](m map[T]Event) []string {
	ids := make([]string, 0, len(m))
	for _, evt := range m {
		ids = append(ids, evt.ID)
	}
	sort.Strings(ids)
	return ids
}

func noteForAction(action AuditAction) string {
	switch action {
	case AuditActionDecision:
		return "initial governance decision"
	case AuditActionCorrection:
		return "correction emitted due to late arrival"
	case AuditActionFinalized:
		return "window finalized"
	case AuditActionQuarantined:
		return "event quarantined"
	default:
		return ""
	}
}

var nowUTC = func() time.Time {
	return time.Now().UTC()
}
