package policy

import (
	"encoding/json"
	"sort"
)

type ChangeType string

const (
	ChangeAdded   ChangeType = "added"
	ChangeRemoved ChangeType = "removed"
	ChangeUpdated ChangeType = "updated"
)

type FlagChange struct {
	Flag          string     `json:"flag"`
	Type          ChangeType `json:"type"`
	ChangedFields []string   `json:"changedFields,omitempty"`
}

func Diff(old Policy, new Policy) []FlagChange {
	changes := []FlagChange{}
	seen := map[string]struct{}{}
	for k := range old.Flags {
		seen[k] = struct{}{}
	}
	for k := range new.Flags {
		seen[k] = struct{}{}
	}

	keys := make([]string, 0, len(seen))
	for k := range seen {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, key := range keys {
		oldFlag, oldOK := old.Flags[key]
		newFlag, newOK := new.Flags[key]

		switch {
		case !oldOK && newOK:
			changes = append(changes, FlagChange{Flag: key, Type: ChangeAdded})
		case oldOK && !newOK:
			changes = append(changes, FlagChange{Flag: key, Type: ChangeRemoved})
		case oldOK && newOK:
			if fields := compareFlags(oldFlag, newFlag); len(fields) > 0 {
				changes = append(changes, FlagChange{Flag: key, Type: ChangeUpdated, ChangedFields: fields})
			}
		}
	}
	return changes
}

func compareFlags(old, new Flag) []string {
	var fields []string
	if !equalStrings(old.Purposes, new.Purposes) {
		fields = append(fields, "purposes")
	}
	if !equalStrings(old.Jurisdictions, new.Jurisdictions) {
		fields = append(fields, "jurisdictions")
	}
	if !equalStrings(old.Audiences, new.Audiences) {
		fields = append(fields, "audiences")
	}
	if !old.ExpiresAt.Equal(new.ExpiresAt) {
		fields = append(fields, "expiresAt")
	}
	if old.Rollout.Percentage != new.Rollout.Percentage {
		fields = append(fields, "rollout.percentage")
	}
	if old.Description != new.Description {
		fields = append(fields, "description")
	}
	return fields
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	aa := append([]string{}, a...)
	bb := append([]string{}, b...)
	sort.Strings(aa)
	sort.Strings(bb)
	return string(mustJSON(aa)) == string(mustJSON(bb))
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
