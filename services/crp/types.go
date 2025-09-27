package crp

import "time"

// Event describes a single consent revocation message that must be propagated.
type Event struct {
	ID        string
	SubjectID string
	ConsentID string
	RevokedAt time.Time
	Metadata  map[string]string
}

// Validate ensures required fields are present.
func (e Event) Validate() error {
	if e.ID == "" {
		return ErrInvalidEvent("missing id")
	}
	if e.SubjectID == "" {
		return ErrInvalidEvent("missing subject id")
	}
	if e.ConsentID == "" {
		return ErrInvalidEvent("missing consent id")
	}
	if e.RevokedAt.IsZero() {
		return ErrInvalidEvent("missing revoked timestamp")
	}
	return nil
}

// ActionResult captures the work carried out for a single downstream system.
type ActionResult struct {
	System  string
	Action  string
	Status  string
	Details string
}

// PropagationResult records the outcome for a single event.
type PropagationResult struct {
	Event   Event
	Actions []ActionResult
}

// SystemState reflects the perspective of an integration during reconciliation.
type SystemState struct {
	System         string
	SubjectPresent bool
	Details        string
}

// ReconciliationReport aggregates state across all integrations.
type ReconciliationReport struct {
	SubjectID     string
	DriftDetected bool
	Systems       []SystemState
}
