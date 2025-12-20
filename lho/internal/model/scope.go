package model

import "sort"

// Scope represents a collection of system specific resource identifiers that
// should be preserved by a hold directive.
type Scope struct {
	Systems map[string][]string `json:"systems"`
}

// Normalized returns a copy of the scope with resource identifiers sorted to
// ensure deterministic processing order.
func (s Scope) Normalized() Scope {
	clone := Scope{Systems: make(map[string][]string, len(s.Systems))}
	for system, resources := range s.Systems {
		items := append([]string(nil), resources...)
		sort.Strings(items)
		clone.Systems[system] = items
	}
	return clone
}

// Keys returns the system identifiers sorted alphabetically.
func (s Scope) Keys() []string {
	keys := make([]string, 0, len(s.Systems))
	for key := range s.Systems {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

// Clone creates a deep copy of the scope without normalizing order.
func (s Scope) Clone() Scope {
	clone := Scope{Systems: make(map[string][]string, len(s.Systems))}
	for system, resources := range s.Systems {
		clone.Systems[system] = append([]string(nil), resources...)
	}
	return clone
}
