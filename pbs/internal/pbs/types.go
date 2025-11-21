package pbs

import "encoding/json"

// HistoricalDecision represents a previously adjudicated request or event.
type HistoricalDecision struct {
	ID            string            `json:"id"`
	Timestamp     string            `json:"timestamp"`
	Actor         string            `json:"actor"`
	Action        string            `json:"action"`
	Attributes    map[string]string `json:"attributes"`
	Canary        bool              `json:"canary"`
	LatencyMS     int               `json:"latency_ms"`
	PayloadHash   string            `json:"payload_hash"`
	PolicyVersion string            `json:"policy_version"`
}

// PolicySnapshot models the rules used when replaying history.
type PolicySnapshot struct {
	Name            string       `json:"name"`
	Version         string       `json:"version"`
	Description     string       `json:"description"`
	DefaultDecision string       `json:"default_decision"`
	BaseLatencyMS   int          `json:"base_latency_ms"`
	Rules           []PolicyRule `json:"rules"`
}

// PolicyRule is evaluated in declaration order until the first match.
type PolicyRule struct {
	ID          string            `json:"id"`
	Description string            `json:"description"`
	Match       map[string]string `json:"match"`
	Decision    string            `json:"decision"`
	LatencyMS   int               `json:"latency_ms"`
}

// EvaluationResult captures the outcome of replaying a single decision.
type EvaluationResult struct {
	DecisionID      string
	OriginalAction  string
	NewAction       string
	Canary          bool
	OriginalLatency int
	NewLatency      int
	AppliedRuleID   string
}

// Summary aggregates headline metrics from the backtest run.
type Summary struct {
	TotalDecisions              int     `json:"total_decisions"`
	OriginalBlockRate           float64 `json:"original_block_rate"`
	NewBlockRate                float64 `json:"new_block_rate"`
	BlockRateDelta              float64 `json:"block_rate_delta"`
	OriginalAverageLatencyMS    float64 `json:"original_average_latency_ms"`
	NewAverageLatencyMS         float64 `json:"new_average_latency_ms"`
	AverageLatencyDeltaMS       float64 `json:"average_latency_delta_ms"`
	FalseNegativeCanaryCatchers int     `json:"false_negative_canary_catchers"`
}

// RuleImpact details how a policy rule affected the replay.
type RuleImpact struct {
	RuleID           string  `json:"rule_id"`
	Matches          int     `json:"matches"`
	BlockEscalations int     `json:"block_escalations"`
	Relaxations      int     `json:"relaxations"`
	ResultingAction  string  `json:"resulting_action"`
	AverageLatency   float64 `json:"average_latency_ms"`
}

// BacktestReport is the canonical output emitted by the engine.
type BacktestReport struct {
	SchemaVersion      string            `json:"schema_version"`
	EngineVersion      string            `json:"engine_version"`
	DeterministicRunID string            `json:"deterministic_run_id"`
	Policy             PolicyMetadata    `json:"policy"`
	Inputs             InputMetadata     `json:"inputs"`
	Summary            Summary           `json:"summary"`
	RuleImpacts        []RuleImpact      `json:"rule_impacts"`
	Signatures         []ReportSignature `json:"signatures,omitempty"`
}

// PolicyMetadata documents the snapshot used for the replay.
type PolicyMetadata struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Digest  string `json:"digest"`
}

// InputMetadata documents the history corpus being replayed.
type InputMetadata struct {
	HistoryDigest  string `json:"history_digest"`
	TotalDecisions int    `json:"total_decisions"`
	Source         string `json:"source"`
}

// ReportSignature cryptographically authenticates the report payload.
type ReportSignature struct {
	KeyID     string `json:"key_id"`
	Algorithm string `json:"algorithm"`
	Digest    string `json:"digest"`
	Signature string `json:"signature"`
}

// Clone returns a deep copy of the policy snapshot.
func (p PolicySnapshot) Clone() PolicySnapshot {
	dup := p
	if len(p.Rules) > 0 {
		dup.Rules = make([]PolicyRule, len(p.Rules))
		copy(dup.Rules, p.Rules)
		for i, rule := range p.Rules {
			if len(rule.Match) == 0 {
				continue
			}
			dupMatch := make(map[string]string, len(rule.Match))
			for k, v := range rule.Match {
				dupMatch[k] = v
			}
			dup.Rules[i].Match = dupMatch
		}
	}
	return dup
}

// MarshalCanonicalJSON encodes a value using deterministic ordering.
func MarshalCanonicalJSON(v any) ([]byte, error) {
	buf, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	// encoding/json is deterministic for structs without map fields. Callers
	// should avoid maps or pre-process them into sorted slices.
	return buf, nil
}
