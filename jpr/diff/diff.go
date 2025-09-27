package diff

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/summit/jpr"
)

// OutcomeDiff captures the change between two evaluation dates.
type OutcomeDiff struct {
	Jurisdiction string       `json:"jurisdiction"`
	DataClass    string       `json:"dataClass"`
	Purpose      string       `json:"purpose"`
	Action       string       `json:"action"`
	Before       jpr.Decision `json:"before"`
	After        jpr.Decision `json:"after"`
}

// Compute generates a diff of all matrix combinations for two decision times.
func Compute(engine *jpr.Engine, before, after time.Time) ([]OutcomeDiff, error) {
	if engine == nil {
		return nil, fmt.Errorf("engine is nil")
	}
	exported := engine.Export()
	seen := map[string]struct{}{}
	diffs := make([]OutcomeDiff, 0)
	for key := range exported.Index {
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		parts := splitKey(key)
		subject := jpr.Subject{DataClass: parts[1], Traits: map[string]string{}}
		ctxBefore := jpr.Context{Jurisdiction: parts[0], Purpose: parts[2], DecisionTime: before}
		ctxAfter := jpr.Context{Jurisdiction: parts[0], Purpose: parts[2], DecisionTime: after}

		beforeDec, err := engine.Can(parts[3], subject, ctxBefore)
		if err != nil {
			return nil, err
		}
		afterDec, err := engine.Can(parts[3], subject, ctxAfter)
		if err != nil {
			return nil, err
		}
		if beforeDec.Effect != afterDec.Effect || beforeDec.PolicyID != afterDec.PolicyID {
			diffs = append(diffs, OutcomeDiff{
				Jurisdiction: parts[0],
				DataClass:    parts[1],
				Purpose:      parts[2],
				Action:       parts[3],
				Before:       beforeDec,
				After:        afterDec,
			})
		}
	}

	sort.Slice(diffs, func(i, j int) bool {
		if diffs[i].Jurisdiction != diffs[j].Jurisdiction {
			return diffs[i].Jurisdiction < diffs[j].Jurisdiction
		}
		if diffs[i].DataClass != diffs[j].DataClass {
			return diffs[i].DataClass < diffs[j].DataClass
		}
		if diffs[i].Purpose != diffs[j].Purpose {
			return diffs[i].Purpose < diffs[j].Purpose
		}
		return diffs[i].Action < diffs[j].Action
	})

	return diffs, nil
}

// ToJSON renders the diff results for snapshot testing.
func ToJSON(diffs []OutcomeDiff) ([]byte, error) {
	data, err := json.MarshalIndent(diffs, "", "  ")
	if err != nil {
		return nil, err
	}
	return data, nil
}

func splitKey(key string) [4]string {
	parts := [4]string{"*", "*", "*", "*"}
	tokens := strings.Split(key, "|")
	for len(tokens) < 4 {
		tokens = append(tokens, "*")
	}
	for i := 0; i < len(parts) && i < len(tokens); i++ {
		parts[i] = tokens[i]
	}
	return parts
}
