package jpr

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// Can evaluates the action given a subject and context, returning the final decision.
func (e *Engine) Can(action string, subject Subject, ctx Context) (Decision, error) {
	explanation, err := e.Explain(action, subject, ctx)
	if err != nil {
		return Decision{}, err
	}
	return explanation.Decision, nil
}

// Explain evaluates the action and returns the full rule chain along with the decision.
func (e *Engine) Explain(action string, subject Subject, ctx Context) (Explanation, error) {
	if e == nil {
		return Explanation{}, fmt.Errorf("engine is nil")
	}
	if action == "" {
		return Explanation{}, fmt.Errorf("action is required")
	}
	keyCandidates := []string{
		makeKey(ctx.Jurisdiction, subject.DataClass, ctx.Purpose, action),
		makeKey(ctx.Jurisdiction, "*", ctx.Purpose, action),
		makeKey(ctx.Jurisdiction, subject.DataClass, "*", action),
		makeKey(ctx.Jurisdiction, "*", "*", action),
		makeKey("*", subject.DataClass, ctx.Purpose, action),
		makeKey("*", "*", ctx.Purpose, action),
		makeKey("*", subject.DataClass, "*", action),
		makeKey("*", "*", "*", action),
	}

	now := ctx.DecisionTime
	if now.IsZero() {
		now = time.Now().UTC()
	}

	traces := make([]RuleTrace, 0)
	for _, key := range keyCandidates {
		entries, ok := e.rules[key]
		if !ok {
			continue
		}
		for _, entry := range entries {
			matched, reason := evaluate(entry, subject, ctx, now)
			trace := RuleTrace{
				PolicyID:      entry.rule.PolicyID,
				Priority:      entry.priority,
				Effect:        entry.rule.Effect,
				EffectiveFrom: entry.rule.EffectiveFrom,
				EffectiveTo:   entry.rule.EffectiveTo,
				Matched:       matched,
				Reason:        reason,
			}
			traces = append(traces, trace)
			if matched {
				decision := Decision{
					Allowed:    entry.rule.Effect == EffectAllow,
					Effect:     entry.rule.Effect,
					PolicyID:   entry.rule.PolicyID,
					Evaluated:  now,
					Reason:     reason,
					MatchedKey: key,
				}
				return Explanation{Decision: decision, Chain: traces}, nil
			}
		}
	}

	decision := Decision{
		Allowed:    e.defaultEffect == EffectAllow,
		Effect:     e.defaultEffect,
		Evaluated:  now,
		Reason:     fmt.Sprintf("default-effect:%s", e.defaultEffect),
		MatchedKey: "",
	}
	return Explanation{Decision: decision, Chain: traces}, nil
}

func evaluate(entry compiledEntry, subject Subject, ctx Context, now time.Time) (bool, string) {
	rule := entry.rule
	if !withinRange(rule.EffectiveFrom, rule.EffectiveTo, now) {
		return false, fmt.Sprintf("out-of-range:%s-%s", formatTime(rule.EffectiveFrom), formatTime(rule.EffectiveTo))
	}

	if !matchesValue(rule.Jurisdiction, ctx.Jurisdiction) {
		return false, fmt.Sprintf("jurisdiction-mismatch:%s", ctx.Jurisdiction)
	}

	if !matchesValue(rule.DataClass, subject.DataClass) {
		return false, fmt.Sprintf("data-class-mismatch:%s", subject.DataClass)
	}

	if !matchesValue(rule.Purpose, ctx.Purpose) {
		return false, fmt.Sprintf("purpose-mismatch:%s", ctx.Purpose)
	}

	for field, expected := range rule.Conditions {
		val := ctx.Facts[field]
		if val == "" {
			val = subject.Traits[field]
		}
		if expected != val {
			return false, fmt.Sprintf("condition-mismatch:%s", field)
		}
	}

	for override := range entry.overrides {
		if override == subject.DataClass || override == ctx.Jurisdiction || override == ctx.Purpose {
			return false, fmt.Sprintf("override-suppressed:%s", override)
		}
	}

	return true, "matched"
}

func withinRange(start, end time.Time, t time.Time) bool {
	if !start.IsZero() && t.Before(start) {
		return false
	}
	if !end.IsZero() && t.After(end) {
		return false
	}
	return true
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return "*"
	}
	return t.Format(isoLayout)
}

func matchesValue(ruleValue, input string) bool {
	if ruleValue == "*" {
		return true
	}
	return strings.EqualFold(ruleValue, input)
}

// Dimensions exposes the enumerated values discovered during compilation.
func (e *Engine) Dimensions() map[string][]string {
	dims := make(map[string][]string, len(e.dimensions))
	for k, v := range e.dimensions {
		dims[k] = make([]string, 0, len(v))
		for value := range v {
			dims[k] = append(dims[k], value)
		}
		sort.Strings(dims[k])
	}
	return dims
}
