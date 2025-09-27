package engine

import "time"

// Event represents a production event evaluated by the PDA engine.
type Event struct {
	ID              string            `json:"id"`
	ConsentID       string            `json:"consentId"`
	DeclaredPurpose string            `json:"declaredPurpose"`
	Endpoint        string            `json:"endpoint"`
	EndpointPurpose string            `json:"endpointPurpose"`
	StreamKind      string            `json:"streamKind"`
	ObservedAt      time.Time         `json:"observedAt"`
	OwnerHint       string            `json:"ownerHint"`
	Metadata        map[string]string `json:"metadata"`
}

// EndpointPolicy defines the allowed purposes for a tagged endpoint.
type EndpointPolicy struct {
	EndpointPurpose   string        `json:"endpointPurpose"`
	AllowedPurposes   []string      `json:"allowedPurposes"`
	Owners            []string      `json:"owners"`
	SuppressionWindow time.Duration `json:"suppressionWindow"`
	Description       string        `json:"description"`
}

// ConsentContract captures the consent/contract configuration for a tenant.
type ConsentContract struct {
	ID               string                    `json:"id"`
	Tenant           string                    `json:"tenant"`
	EndpointPolicies map[string]EndpointPolicy `json:"endpointPolicies"`
	Metadata         map[string]string         `json:"metadata"`
}

// RuleUpdate represents a streaming change to the consent registry.
type RuleUpdate struct {
	ContractID string         `json:"contractId"`
	Policy     EndpointPolicy `json:"policy"`
	Delete     bool           `json:"delete"`
	Version    int            `json:"version"`
}

// TraceStep documents a single evaluation step.
type TraceStep struct {
	Description string `json:"description"`
	Evidence    string `json:"evidence"`
}

// Trace links the policy, event, and verdict for explainability.
type Trace struct {
	EventID    string         `json:"eventId"`
	ContractID string         `json:"contractId"`
	PolicyID   string         `json:"policyId"`
	Policy     EndpointPolicy `json:"policy"`
	Event      Event          `json:"event"`
	Verdict    string         `json:"verdict"`
	Steps      []TraceStep    `json:"steps"`
	Suppressed bool           `json:"suppressed"`
}

// Verdict captures the decision returned to callers.
type Verdict struct {
	Drift         bool   `json:"drift"`
	Suppressed    bool   `json:"suppressed"`
	Owner         string `json:"owner"`
	Reason        string `json:"reason"`
	FalsePositive bool   `json:"falsePositive"`
	Trace         Trace  `json:"trace"`
}

// Alert represents a persisted drift finding.
type Alert struct {
	Event    Event     `json:"event"`
	Verdict  Verdict   `json:"verdict"`
	RaisedAt time.Time `json:"raisedAt"`
}

// Config controls engine level behaviour.
type Config struct {
	FalsePositiveTarget float64       `json:"falsePositiveTarget"`
	DefaultSuppression  time.Duration `json:"defaultSuppression"`
	MaxTraces           int           `json:"maxTraces"`
}
