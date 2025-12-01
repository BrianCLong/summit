package jpr

import "time"

// Effect enumerates the possible outcomes of a policy evaluation.
type Effect string

const (
	// EffectAllow indicates the policy permits the action.
	EffectAllow Effect = "allow"
	// EffectDeny indicates the policy forbids the action.
	EffectDeny Effect = "deny"
)

// PolicyDocument represents the full YAML configuration describing precedence rules and policies.
type PolicyDocument struct {
	Version         string            `yaml:"version" json:"version"`
	DefaultEffect   Effect            `yaml:"defaultEffect" json:"defaultEffect"`
	Policies        []Policy          `yaml:"policies" json:"policies"`
	PrecedenceRules []PrecedenceRule  `yaml:"precedenceRules" json:"precedenceRules"`
	Variables       map[string]string `yaml:"variables" json:"variables"`
}

// Policy describes a single rule entry in the matrix.
type Policy struct {
	ID            string            `yaml:"id" json:"id"`
	Description   string            `yaml:"description" json:"description"`
	Jurisdictions []string          `yaml:"jurisdictions" json:"jurisdictions"`
	DataClasses   []string          `yaml:"dataClasses" json:"dataClasses"`
	Purposes      []string          `yaml:"purposes" json:"purposes"`
	Actions       []string          `yaml:"actions" json:"actions"`
	Effect        Effect            `yaml:"effect" json:"effect"`
	Precedence    *int              `yaml:"precedence" json:"precedence"`
	Conditions    map[string]string `yaml:"conditions" json:"conditions"`
	EffectiveFrom string            `yaml:"effectiveFrom" json:"effectiveFrom"`
	EffectiveTo   string            `yaml:"effectiveTo" json:"effectiveTo"`
	Overrides     []string          `yaml:"overrides" json:"overrides"`
}

// PrecedenceRule assigns an implicit priority to policies that match its criteria.
type PrecedenceRule struct {
	ID       string          `yaml:"id" json:"id"`
	Match    MatchExpression `yaml:"match" json:"match"`
	Priority int             `yaml:"priority" json:"priority"`
}

// MatchExpression constrains precedence rules to a subset of the matrix.
type MatchExpression struct {
	Jurisdictions []string `yaml:"jurisdictions" json:"jurisdictions"`
	DataClasses   []string `yaml:"dataClasses" json:"dataClasses"`
	Purposes      []string `yaml:"purposes" json:"purposes"`
	Actions       []string `yaml:"actions" json:"actions"`
	Effects       []Effect `yaml:"effects" json:"effects"`
}

// Subject represents the entity whose data is under consideration.
type Subject struct {
	DataClass string            `json:"dataClass"`
	Traits    map[string]string `json:"traits"`
}

// Context represents the runtime context for a policy evaluation.
type Context struct {
	Jurisdiction string            `json:"jurisdiction"`
	Purpose      string            `json:"purpose"`
	DecisionTime time.Time         `json:"decisionTime"`
	Facts        map[string]string `json:"facts"`
}

// Decision is the result of an authorization check.
type Decision struct {
	Allowed    bool      `json:"allowed"`
	Effect     Effect    `json:"effect"`
	PolicyID   string    `json:"policyId"`
	Evaluated  time.Time `json:"evaluated"`
	Reason     string    `json:"reason"`
	MatchedKey string    `json:"matchedKey"`
}

// RuleTrace captures a single rule evaluation during explanation.
type RuleTrace struct {
	PolicyID      string    `json:"policyId"`
	Priority      int       `json:"priority"`
	Effect        Effect    `json:"effect"`
	EffectiveFrom time.Time `json:"effectiveFrom"`
	EffectiveTo   time.Time `json:"effectiveTo"`
	Matched       bool      `json:"matched"`
	Reason        string    `json:"reason"`
}

// Explanation includes the final decision and the rule chain that produced it.
type Explanation struct {
	Decision Decision    `json:"decision"`
	Chain    []RuleTrace `json:"chain"`
}

// CompiledEngine is an exported representation used by TypeScript bindings and tooling.
type CompiledEngine struct {
	Version       string              `json:"version"`
	GeneratedAt   time.Time           `json:"generatedAt"`
	DefaultEffect Effect              `json:"defaultEffect"`
	Rules         []CompiledRule      `json:"rules"`
	Index         map[string][]int    `json:"index"`
	ETag          string              `json:"etag"`
	TTL           time.Duration       `json:"ttl"`
	Metadata      map[string]string   `json:"metadata"`
	Dimensions    map[string][]string `json:"dimensions"`
}

// CompiledRule captures an optimized rule for constant-time lookup.
type CompiledRule struct {
	PolicyID      string            `json:"policyId"`
	Action        string            `json:"action"`
	Jurisdiction  string            `json:"jurisdiction"`
	DataClass     string            `json:"dataClass"`
	Purpose       string            `json:"purpose"`
	Effect        Effect            `json:"effect"`
	Priority      int               `json:"priority"`
	EffectiveFrom time.Time         `json:"effectiveFrom"`
	EffectiveTo   time.Time         `json:"effectiveTo"`
	Conditions    map[string]string `json:"conditions"`
	Description   string            `json:"description"`
	Overrides     []string          `json:"overrides"`
}
