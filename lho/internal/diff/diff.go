package diff

import (
	"sort"

	"github.com/summit/lho/internal/model"
)

// Result captures the delta between two scopes.
type Result struct {
	Added     map[string][]string `json:"added"`
	Removed   map[string][]string `json:"removed"`
	Unchanged map[string][]string `json:"unchanged"`
}

// Calculate produces a deterministic scope diff. Results are sorted to ensure
// stable presentation for both API consumers and the UI layer.
func Calculate(previous, next model.Scope) Result {
	prev := previous.Normalized()
	nxt := next.Normalized()

	result := Result{
		Added:     make(map[string][]string),
		Removed:   make(map[string][]string),
		Unchanged: make(map[string][]string),
	}

	allSystems := map[string]struct{}{}
	for _, key := range prev.Keys() {
		allSystems[key] = struct{}{}
	}
	for _, key := range nxt.Keys() {
		allSystems[key] = struct{}{}
	}

	systems := make([]string, 0, len(allSystems))
	for key := range allSystems {
		systems = append(systems, key)
	}
	sort.Strings(systems)

	for _, system := range systems {
		prevResources := prev.Systems[system]
		nextResources := nxt.Systems[system]

		prevSet := make(map[string]struct{}, len(prevResources))
		for _, id := range prevResources {
			prevSet[id] = struct{}{}
		}

		nextSet := make(map[string]struct{}, len(nextResources))
		for _, id := range nextResources {
			nextSet[id] = struct{}{}
		}

		var added, removed, unchanged []string
		for id := range nextSet {
			if _, ok := prevSet[id]; !ok {
				added = append(added, id)
			} else {
				unchanged = append(unchanged, id)
			}
		}
		for id := range prevSet {
			if _, ok := nextSet[id]; !ok {
				removed = append(removed, id)
			}
		}

		if len(added) > 0 {
			sort.Strings(added)
			result.Added[system] = added
		}
		if len(removed) > 0 {
			sort.Strings(removed)
			result.Removed[system] = removed
		}
		if len(unchanged) > 0 {
			sort.Strings(unchanged)
			result.Unchanged[system] = unchanged
		}
	}

	return result
}
