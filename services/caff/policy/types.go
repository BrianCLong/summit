package policy

import "time"

type Decision string

const (
	DecisionAllow  Decision = "allow"
	DecisionDeny   Decision = "deny"
	DecisionStepUp Decision = "step-up"
)

type ExplainStep struct {
	Rule    string `json:"rule"`
	Result  string `json:"result"`
	Details string `json:"details,omitempty"`
}

type Flag struct {
	Key           string    `json:"key"`
	Description   string    `json:"description,omitempty"`
	Purposes      []string  `json:"purposes,omitempty"`
	Jurisdictions []string  `json:"jurisdictions,omitempty"`
	Audiences     []string  `json:"audiences,omitempty"`
	ExpiresAt     time.Time `json:"expiresAt"`
	Rollout       Rollout   `json:"rollout"`
}

type Rollout struct {
	Percentage int `json:"percentage"`
}

type Policy struct {
	Flags map[string]Flag `json:"flags"`
}

type SubjectContext struct {
	SubjectID    string            `json:"subjectId"`
	BucketID     string            `json:"bucketId,omitempty"`
	Jurisdiction string            `json:"jurisdiction"`
	Audiences    []string          `json:"audiences,omitempty"`
	Consents     map[string]string `json:"consents,omitempty"`
	EvaluatedAt  time.Time         `json:"evaluatedAt"`
}

func (p Policy) Copy() Policy {
	out := Policy{Flags: make(map[string]Flag, len(p.Flags))}
	for k, v := range p.Flags {
		out.Flags[k] = v
	}
	return out
}

func DefaultRollout() Rollout {
	return Rollout{Percentage: 100}
}
