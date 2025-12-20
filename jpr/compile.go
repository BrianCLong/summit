package jpr

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
	"strings"
	"time"
)

const (
	isoLayout = "2006-01-02"
)

// Engine is the runtime evaluator compiled from a PolicyDocument.
type Engine struct {
	defaultEffect Effect
	rules         map[string][]compiledEntry
	etag          string
	ttl           time.Duration
	generatedAt   time.Time
	dimensions    map[string]map[string]struct{}
}

type compiledEntry struct {
	rule      CompiledRule
	priority  int
	policy    Policy
	overrides map[string]struct{}
}

// Compile builds a deterministic Engine from a policy document and TTL in seconds.
func Compile(doc PolicyDocument, ttl time.Duration) (*Engine, error) {
	if doc.DefaultEffect == "" {
		doc.DefaultEffect = EffectDeny
	}

	now := time.Now().UTC()
	dimensions := map[string]map[string]struct{}{
		"jurisdictions": {},
		"dataClasses":   {},
		"purposes":      {},
		"actions":       {},
	}

	precedenceResolver := newPrecedenceResolver(doc.PrecedenceRules)

	compiled := make(map[string][]compiledEntry)
	for _, p := range doc.Policies {
		normalized, err := normalizePolicy(p, doc.Variables)
		if err != nil {
			return nil, fmt.Errorf("policy %s: %w", p.ID, err)
		}

		priority := precedenceResolver.Resolve(normalized)
		if normalized.Precedence != nil {
			priority = *normalized.Precedence
		}

		effFrom, effTo, err := parseEffectiveRange(normalized.EffectiveFrom, normalized.EffectiveTo)
		if err != nil {
			return nil, fmt.Errorf("policy %s: %w", normalized.ID, err)
		}

		for _, j := range normalized.Jurisdictions {
			for _, dc := range normalized.DataClasses {
				for _, pur := range normalized.Purposes {
					for _, act := range normalized.Actions {
						key := makeKey(j, dc, pur, act)

						entry := compiledEntry{
							priority:  priority,
							policy:    normalized,
							overrides: toSet(normalized.Overrides),
							rule: CompiledRule{
								PolicyID:      normalized.ID,
								Action:        act,
								Jurisdiction:  j,
								DataClass:     dc,
								Purpose:       pur,
								Effect:        normalized.Effect,
								Priority:      priority,
								EffectiveFrom: effFrom,
								EffectiveTo:   effTo,
								Conditions:    cloneMap(normalized.Conditions),
								Description:   normalized.Description,
								Overrides:     append([]string{}, normalized.Overrides...),
							},
						}
						compiled[key] = append(compiled[key], entry)

						dimensions["jurisdictions"][j] = struct{}{}
						dimensions["dataClasses"][dc] = struct{}{}
						dimensions["purposes"][pur] = struct{}{}
						dimensions["actions"][act] = struct{}{}
					}
				}
			}
		}
	}

	for key := range compiled {
		sort.SliceStable(compiled[key], func(i, j int) bool {
			if compiled[key][i].priority == compiled[key][j].priority {
				if compiled[key][i].policy.Effect == compiled[key][j].policy.Effect {
					return compiled[key][i].policy.ID < compiled[key][j].policy.ID
				}
				return compiled[key][i].policy.Effect == EffectDeny
			}
			return compiled[key][i].priority > compiled[key][j].priority
		})
	}

	etag := computeETag(doc)

	return &Engine{
		defaultEffect: doc.DefaultEffect,
		rules:         compiled,
		etag:          etag,
		ttl:           ttl,
		generatedAt:   now,
		dimensions:    dimensions,
	}, nil
}

func normalizePolicy(policy Policy, vars map[string]string) (Policy, error) {
	normalized := policy
	normalized.Jurisdictions = expandList(normalized.Jurisdictions, vars)
	normalized.DataClasses = expandList(normalized.DataClasses, vars)
	normalized.Purposes = expandList(normalized.Purposes, vars)
	normalized.Actions = expandList(normalized.Actions, vars)
	if len(normalized.Actions) == 0 {
		return Policy{}, fmt.Errorf("at least one action required")
	}
	if len(normalized.Jurisdictions) == 0 {
		normalized.Jurisdictions = []string{"*"}
	}
	if len(normalized.DataClasses) == 0 {
		normalized.DataClasses = []string{"*"}
	}
	if len(normalized.Purposes) == 0 {
		normalized.Purposes = []string{"*"}
	}
	if normalized.Effect == "" {
		normalized.Effect = EffectDeny
	}
	return normalized, nil
}

func expandList(values []string, vars map[string]string) []string {
	if len(values) == 0 {
		return values
	}
	expanded := make([]string, 0, len(values))
	for _, v := range values {
		if vars != nil {
			if val, ok := vars[v]; ok {
				expanded = append(expanded, strings.Split(val, ",")...)
				continue
			}
		}
		expanded = append(expanded, v)
	}
	uniq := map[string]struct{}{}
	filtered := make([]string, 0, len(expanded))
	for _, v := range expanded {
		if _, exists := uniq[v]; !exists {
			uniq[v] = struct{}{}
			filtered = append(filtered, v)
		}
	}
	sort.Strings(filtered)
	return filtered
}

func toSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, v := range values {
		set[v] = struct{}{}
	}
	return set
}

func cloneMap(in map[string]string) map[string]string {
	if in == nil {
		return nil
	}
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func makeKey(jurisdiction, dataClass, purpose, action string) string {
	return strings.Join([]string{jurisdiction, dataClass, purpose, action}, "|")
}

func parseEffectiveRange(from, to string) (time.Time, time.Time, error) {
	var start time.Time
	var end time.Time
	var err error
	if from != "" {
		start, err = time.Parse(isoLayout, from)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid effectiveFrom: %w", err)
		}
	}
	if to != "" {
		end, err = time.Parse(isoLayout, to)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid effectiveTo: %w", err)
		}
	}
	return start, end, nil
}

func computeETag(doc PolicyDocument) string {
	h := sha256.New()
	writeString := func(values ...string) {
		for _, v := range values {
			_, _ = h.Write([]byte(v))
		}
	}
	writeString(doc.Version, string(doc.DefaultEffect))
	for _, p := range doc.Policies {
		writeString(p.ID, p.Description, string(p.Effect))
		writeString(strings.Join(p.Actions, ","))
		writeString(strings.Join(p.Jurisdictions, ","))
		writeString(strings.Join(p.DataClasses, ","))
		writeString(strings.Join(p.Purposes, ","))
		writeString(p.EffectiveFrom, p.EffectiveTo)
		writeString(fmt.Sprint(p.Precedence))
		for k, v := range p.Conditions {
			writeString(k, v)
		}
	}
	for _, pr := range doc.PrecedenceRules {
		writeString(pr.ID, fmt.Sprint(pr.Priority))
		writeString(strings.Join(pr.Match.Jurisdictions, ","))
		writeString(strings.Join(pr.Match.DataClasses, ","))
		writeString(strings.Join(pr.Match.Purposes, ","))
		writeString(strings.Join(pr.Match.Actions, ","))
	}
	return hex.EncodeToString(h.Sum(nil))
}

// ETag returns the strong identifier for the compiled engine.
func (e *Engine) ETag() string {
	return e.etag
}

// TTL exposes the configured cache duration.
func (e *Engine) TTL() time.Duration {
	return e.ttl
}

// GeneratedAt returns the compilation time.
func (e *Engine) GeneratedAt() time.Time {
	return e.generatedAt
}

// Export produces a serialisable snapshot for TypeScript bindings and tooling.
func (e *Engine) Export() CompiledEngine {
	index := make(map[string][]int, len(e.rules))
	allRules := make([]CompiledRule, 0)
	for key, entries := range e.rules {
		index[key] = make([]int, len(entries))
		for i, entry := range entries {
			index[key][i] = len(allRules)
			allRules = append(allRules, entry.rule)
		}
	}
	dims := map[string][]string{}
	for name, values := range e.dimensions {
		dims[name] = make([]string, 0, len(values))
		for v := range values {
			dims[name] = append(dims[name], v)
		}
		sort.Strings(dims[name])
	}

	metadata := map[string]string{
		"generatedAt": e.generatedAt.Format(time.RFC3339Nano),
	}

	return CompiledEngine{
		Version:       "v1",
		GeneratedAt:   e.generatedAt,
		DefaultEffect: e.defaultEffect,
		Rules:         allRules,
		Index:         index,
		ETag:          e.etag,
		TTL:           e.ttl,
		Metadata:      metadata,
		Dimensions:    dims,
	}
}

func newPrecedenceResolver(rules []PrecedenceRule) *precedenceResolver {
	resolver := &precedenceResolver{}
	for _, r := range rules {
		resolver.rules = append(resolver.rules, r)
	}
	sort.SliceStable(resolver.rules, func(i, j int) bool {
		return resolver.rules[i].Priority > resolver.rules[j].Priority
	})
	return resolver
}

type precedenceResolver struct {
	rules []PrecedenceRule
}

func (p *precedenceResolver) Resolve(policy Policy) int {
	highest := 0
	for _, rule := range p.rules {
		if !matches(rule.Match.Jurisdictions, policy.Jurisdictions) {
			continue
		}
		if !matches(rule.Match.DataClasses, policy.DataClasses) {
			continue
		}
		if !matches(rule.Match.Purposes, policy.Purposes) {
			continue
		}
		if !matches(rule.Match.Actions, policy.Actions) {
			continue
		}
		if len(rule.Match.Effects) > 0 {
			effectMatch := false
			for _, eff := range rule.Match.Effects {
				if eff == policy.Effect {
					effectMatch = true
					break
				}
			}
			if !effectMatch {
				continue
			}
		}
		if rule.Priority > highest {
			highest = rule.Priority
		}
	}
	return highest
}

func matches(criteria []string, values []string) bool {
	if len(criteria) == 0 {
		return true
	}
	for _, c := range criteria {
		if c == "*" {
			return true
		}
		for _, v := range values {
			if v == c {
				return true
			}
		}
	}
	return false
}
