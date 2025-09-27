package policy

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/summit/pacdc/pkg/config"
)

// Engine evaluates stream policies during replication.
type Engine struct {
	policies map[string]config.PolicyConfig
}

// NewEngine constructs an Engine from policy configs.
func NewEngine(policies map[string]config.PolicyConfig) *Engine {
	copied := make(map[string]config.PolicyConfig, len(policies))
	for k, v := range policies {
		copied[k] = v
	}
	return &Engine{policies: copied}
}

// PolicyHash returns a deterministic hash of the loaded policies.
func (e *Engine) PolicyHash() (string, error) {
	bytes, err := json.Marshal(e.policies)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:]), nil
}

// StreamMetadata contains schema and tagging context for policies.
type StreamMetadata struct {
	Name   string
	Tags   map[string]string
	Policy string
}

// ErrUnknownPolicy indicates a referenced policy is missing.
var ErrUnknownPolicy = errors.New("policy: unknown policy reference")

// Apply enforces policy on a row. It returns the filtered row and a boolean
// indicating whether the row should be replicated.
func (e *Engine) Apply(meta StreamMetadata, row map[string]any) (map[string]any, bool, error) {
	if e == nil {
		cloned := cloneRow(row)
		return cloned, true, nil
	}
	var pol config.PolicyConfig
	if meta.Policy != "" {
		existing, ok := e.policies[meta.Policy]
		if !ok {
			return nil, false, fmt.Errorf("%w: %s", ErrUnknownPolicy, meta.Policy)
		}
		pol = existing
	}

	if !passesRowFilters(pol.RowFilters, row) {
		return nil, false, nil
	}
	if !passesJurisdiction(pol.Jurisdictions, row) {
		return nil, false, nil
	}

	filtered := filterColumns(pol.Columns, row)
	redactColumns(pol.Columns, filtered)
	return filtered, true, nil
}

func passesRowFilters(filters []config.RowFilter, row map[string]any) bool {
	for _, rf := range filters {
		value, ok := row[rf.Column]
		if !ok {
			return false
		}
		switch strings.ToLower(rf.Operator) {
		case "eq", "=", "==":
			if value != rf.Value {
				return false
			}
		case "neq", "!=":
			if value == rf.Value {
				return false
			}
		case "in":
			arr, ok := rf.Value.([]any)
			if !ok {
				return false
			}
			if !slices.Contains(arr, value) {
				return false
			}
		default:
			return false
		}
	}
	return true
}

func passesJurisdiction(rules []config.JurisdictionRule, row map[string]any) bool {
	for _, rule := range rules {
		value, ok := row[rule.Column]
		if !ok {
			return false
		}
		strVal, ok := value.(string)
		if !ok {
			return false
		}
		allowed := make(map[string]struct{}, len(rule.Allowed))
		for _, v := range rule.Allowed {
			allowed[strings.ToUpper(v)] = struct{}{}
		}
		if _, ok := allowed[strings.ToUpper(strVal)]; !ok {
			return false
		}
	}
	return true
}

func filterColumns(columns []config.ColumnPolicy, row map[string]any) map[string]any {
	if len(columns) == 0 {
		return cloneRow(row)
	}
	allowSet := make(map[string]struct{})
	denySet := make(map[string]struct{})
	allowListed := false
	for _, col := range columns {
		action := strings.ToLower(col.Action)
		switch action {
		case "allow":
			allowSet[col.Column] = struct{}{}
			allowListed = true
		case "deny":
			denySet[col.Column] = struct{}{}
		case "redact":
			allowSet[col.Column] = struct{}{}
			allowListed = true
		}
	}

	filtered := make(map[string]any)
	if allowListed {
		for col := range allowSet {
			if _, denied := denySet[col]; denied {
				continue
			}
			if value, ok := row[col]; ok {
				filtered[col] = value
			}
		}
		return filtered
	}

	for col, value := range row {
		if _, denied := denySet[col]; denied {
			continue
		}
		filtered[col] = value
	}
	return filtered
}

func redactColumns(columns []config.ColumnPolicy, row map[string]any) {
	for _, col := range columns {
		if strings.ToLower(col.Action) == "redact" {
			if _, ok := row[col.Column]; ok {
				row[col.Column] = "[REDACTED]"
			}
		}
	}
}

func cloneRow(row map[string]any) map[string]any {
	out := make(map[string]any, len(row))
	for k, v := range row {
		out[k] = v
	}
	return out
}
