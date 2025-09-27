package pbs

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
)

const (
	engineVersion = "0.1.0"
	schemaVersion = "2024-09-01"
	defaultSource = "historical-log"
	defaultRuleID = "__default__"
)

var allowedDecisions = map[string]struct{}{
	"allow":     {},
	"deny":      {},
	"redact":    {},
	"transform": {},
}

// Engine replays history under a provided policy snapshot.
type Engine struct {
	policy PolicySnapshot
}

// NewEngine constructs a new deterministic backtest engine.
func NewEngine(policy PolicySnapshot) (*Engine, error) {
	if err := validatePolicy(policy); err != nil {
		return nil, err
	}
	return &Engine{policy: policy.Clone()}, nil
}

// Run executes the replay for the supplied history corpus.
func (e *Engine) Run(history []HistoricalDecision) (Summary, []RuleImpact, []EvaluationResult) {
	sorted := make([]HistoricalDecision, len(history))
	copy(sorted, history)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Timestamp == sorted[j].Timestamp {
			return sorted[i].ID < sorted[j].ID
		}
		return sorted[i].Timestamp < sorted[j].Timestamp
	})

	var (
		evaluations          = make([]EvaluationResult, 0, len(sorted))
		ruleStats            = map[string]*ruleAccumulator{}
		total                = len(sorted)
		originalBlockCount   int
		newBlockCount        int
		originalLatencyTotal int
		newLatencyTotal      int
		canaryCatches        int
	)

	for _, decision := range sorted {
		if _, ok := allowedDecisions[decision.Action]; !ok {
			// Treat unknown decisions as allow to avoid inflating block deltas.
			decision.Action = "allow"
		}

		originalLatencyTotal += decision.LatencyMS
		if isBlocking(decision.Action) {
			originalBlockCount++
		}

		result := e.evaluate(decision)

		newLatencyTotal += result.NewLatency
		if isBlocking(result.NewAction) {
			newBlockCount++
		}

		if decision.Canary && decision.Action == "allow" && result.NewAction != "allow" {
			canaryCatches++
		}

		eval := EvaluationResult{
			DecisionID:      decision.ID,
			OriginalAction:  decision.Action,
			NewAction:       result.NewAction,
			Canary:          decision.Canary,
			OriginalLatency: decision.LatencyMS,
			NewLatency:      result.NewLatency,
			AppliedRuleID:   result.AppliedRuleID,
		}
		evaluations = append(evaluations, eval)

		acc, ok := ruleStats[result.AppliedRuleID]
		if !ok {
			acc = &ruleAccumulator{}
			ruleStats[result.AppliedRuleID] = acc
		}
		acc.matches++
		acc.totalLatency += result.NewLatency
		if !isBlocking(decision.Action) && isBlocking(result.NewAction) {
			acc.blockEscalations++
		}
		if isBlocking(decision.Action) && !isBlocking(result.NewAction) {
			acc.relaxations++
		}
		acc.resultingAction = result.NewAction
	}

	summary := buildSummary(total, originalBlockCount, newBlockCount, originalLatencyTotal, newLatencyTotal, canaryCatches)

	impacts := make([]RuleImpact, 0, len(ruleStats))
	ruleIDs := make([]string, 0, len(ruleStats))
	for ruleID := range ruleStats {
		ruleIDs = append(ruleIDs, ruleID)
	}
	sort.Strings(ruleIDs)
	for _, ruleID := range ruleIDs {
		acc := ruleStats[ruleID]
		avgLatency := 0.0
		if acc.matches > 0 {
			avgLatency = round2(float64(acc.totalLatency) / float64(acc.matches))
		}
		impacts = append(impacts, RuleImpact{
			RuleID:           ruleID,
			Matches:          acc.matches,
			BlockEscalations: acc.blockEscalations,
			Relaxations:      acc.relaxations,
			ResultingAction:  acc.resultingAction,
			AverageLatency:   avgLatency,
		})
	}

	return summary, impacts, evaluations
}

func (e *Engine) evaluate(decision HistoricalDecision) EvaluationResult {
	appliedRuleID := defaultRuleID
	action := e.policy.DefaultDecision
	latency := decision.LatencyMS + e.policy.BaseLatencyMS

	for _, rule := range e.policy.Rules {
		if matches(rule.Match, decision.Attributes) {
			appliedRuleID = rule.ID
			if rule.Decision != "" {
				action = rule.Decision
			}
			latency += rule.LatencyMS
			break
		}
	}

	if _, ok := allowedDecisions[action]; !ok {
		action = "allow"
	}

	return EvaluationResult{
		DecisionID:      decision.ID,
		OriginalAction:  decision.Action,
		NewAction:       action,
		Canary:          decision.Canary,
		OriginalLatency: decision.LatencyMS,
		NewLatency:      latency,
		AppliedRuleID:   appliedRuleID,
	}
}

func matches(match map[string]string, attrs map[string]string) bool {
	if len(match) == 0 {
		return false
	}
	for key, expected := range match {
		if actual, ok := attrs[key]; !ok || !strings.EqualFold(actual, expected) {
			return false
		}
	}
	return true
}

func isBlocking(action string) bool {
	_, ok := allowedDecisions[action]
	if !ok {
		return false
	}
	return action != "allow"
}

func buildSummary(total, originalBlockCount, newBlockCount, originalLatencyTotal, newLatencyTotal, canaryCatches int) Summary {
	if total == 0 {
		return Summary{}
	}

	origBlockRate := float64(originalBlockCount) / float64(total)
	newBlockRate := float64(newBlockCount) / float64(total)

	origAvgLatency := float64(originalLatencyTotal) / float64(total)
	newAvgLatency := float64(newLatencyTotal) / float64(total)

	return Summary{
		TotalDecisions:              total,
		OriginalBlockRate:           round4(origBlockRate),
		NewBlockRate:                round4(newBlockRate),
		BlockRateDelta:              round4(newBlockRate - origBlockRate),
		OriginalAverageLatencyMS:    round2(origAvgLatency),
		NewAverageLatencyMS:         round2(newAvgLatency),
		AverageLatencyDeltaMS:       round2(newAvgLatency - origAvgLatency),
		FalseNegativeCanaryCatchers: canaryCatches,
	}
}

func validatePolicy(policy PolicySnapshot) error {
	if policy.Name == "" {
		return errors.New("policy name is required")
	}
	if policy.Version == "" {
		return errors.New("policy version is required")
	}
	if policy.DefaultDecision == "" {
		policy.DefaultDecision = "allow"
	}
	if _, ok := allowedDecisions[policy.DefaultDecision]; !ok {
		return fmt.Errorf("unsupported default decision: %s", policy.DefaultDecision)
	}
	seen := map[string]struct{}{}
	for _, rule := range policy.Rules {
		if rule.ID == "" {
			return errors.New("policy rule id is required")
		}
		if _, ok := seen[rule.ID]; ok {
			return fmt.Errorf("duplicate rule id %s", rule.ID)
		}
		seen[rule.ID] = struct{}{}
		if rule.Decision != "" {
			if _, ok := allowedDecisions[rule.Decision]; !ok {
				return fmt.Errorf("unsupported decision %s in rule %s", rule.Decision, rule.ID)
			}
		}
	}
	return nil
}

func computeDigest(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func round2(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}

func round4(value float64) float64 {
	return float64(int(value*10000+0.5)) / 10000
}

type ruleAccumulator struct {
	matches          int
	blockEscalations int
	relaxations      int
	totalLatency     int
	resultingAction  string
}

// BuildReport assembles a canonical report payload.
func BuildReport(summary Summary, impacts []RuleImpact, policy PolicySnapshot, historyDigest string) BacktestReport {
	runID := computeRunID(policy, historyDigest)
	sort.Slice(impacts, func(i, j int) bool {
		return impacts[i].RuleID < impacts[j].RuleID
	})
	return BacktestReport{
		SchemaVersion:      schemaVersion,
		EngineVersion:      engineVersion,
		DeterministicRunID: runID,
		Policy: PolicyMetadata{
			Name:    policy.Name,
			Version: policy.Version,
			Digest:  computePolicyDigest(policy),
		},
		Inputs: InputMetadata{
			HistoryDigest:  historyDigest,
			TotalDecisions: summary.TotalDecisions,
			Source:         defaultSource,
		},
		Summary:     summary,
		RuleImpacts: impacts,
	}
}

func computeRunID(policy PolicySnapshot, historyDigest string) string {
	builder := strings.Builder{}
	builder.WriteString(policy.Name)
	builder.WriteString(":")
	builder.WriteString(policy.Version)
	builder.WriteString(":")
	builder.WriteString(computePolicyDigest(policy))
	builder.WriteString(":")
	builder.WriteString(historyDigest)
	builder.WriteString(":")
	builder.WriteString(engineVersion)
	sum := sha256.Sum256([]byte(builder.String()))
	return hex.EncodeToString(sum[:])
}

func computePolicyDigest(policy PolicySnapshot) string {
	builder := strings.Builder{}
	builder.WriteString(policy.Name)
	builder.WriteString(":")
	builder.WriteString(policy.Version)
	builder.WriteString(":")
	builder.WriteString(strings.TrimSpace(policy.Description))
	builder.WriteString(":")
	builder.WriteString(policy.DefaultDecision)
	builder.WriteString(":")
	builder.WriteString(fmt.Sprintf("%d", policy.BaseLatencyMS))
	ruleIDs := make([]string, 0, len(policy.Rules))
	for _, rule := range policy.Rules {
		builder.WriteString("|")
		builder.WriteString(rule.ID)
		builder.WriteString(":")
		builder.WriteString(rule.Decision)
		builder.WriteString(":")
		builder.WriteString(fmt.Sprintf("%d", rule.LatencyMS))
		keys := make([]string, 0, len(rule.Match))
		for k := range rule.Match {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			builder.WriteString(":")
			builder.WriteString(k)
			builder.WriteString("=")
			builder.WriteString(strings.ToLower(rule.Match[k]))
		}
		ruleIDs = append(ruleIDs, rule.ID)
	}
	sum := sha256.Sum256([]byte(builder.String()))
	return hex.EncodeToString(sum[:])
}

// Replay orchestrates the full replay lifecycle given raw inputs.
func Replay(history []HistoricalDecision, policy PolicySnapshot, historyDigest string) BacktestReport {
	engine, err := NewEngine(policy)
	if err != nil {
		panic(err)
	}
	summary, impacts, _ := engine.Run(history)
	return BuildReport(summary, impacts, policy, historyDigest)
}
