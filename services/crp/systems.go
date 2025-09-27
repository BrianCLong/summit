package crp

import (
	"fmt"
	"sort"
	"strings"
	"sync"
)

// System represents a downstream integration that must respond to consent
// revocations.
type System interface {
	Name() string
	Apply(Event) (ActionResult, error)
	Snapshot(subjectID string) (SystemState, error)
}

// ExperimentAssignments removes experiment allocations for a subject.
type ExperimentAssignments struct {
	mu            sync.Mutex
	assignments   map[string]map[string]struct{}
	deterministic []string
}

// NewExperimentAssignments constructs a new experiment subsystem.
func NewExperimentAssignments(assignments map[string]map[string]struct{}) *ExperimentAssignments {
	deterministic := make([]string, 0, len(assignments))
	for experiment := range assignments {
		deterministic = append(deterministic, experiment)
	}
	sort.Strings(deterministic)
	return &ExperimentAssignments{assignments: assignments, deterministic: deterministic}
}

func (e *ExperimentAssignments) Name() string { return "experiment-assignments" }

// Apply removes the subject from every experiment.
func (e *ExperimentAssignments) Apply(event Event) (ActionResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	removed := 0
	for _, experiment := range e.deterministic {
		subjects := e.assignments[experiment]
		if subjects == nil {
			continue
		}
		if _, ok := subjects[event.SubjectID]; ok {
			delete(subjects, event.SubjectID)
			removed++
		}
	}

	action := fmt.Sprintf("removed subject from %d experiments", removed)
	status := "success"
	if removed == 0 {
		action = "no assignments for subject"
		status = "noop"
	}

	return ActionResult{
		System: e.Name(),
		Action: action,
		Status: status,
	}, nil
}

// Snapshot reports whether the subject is still allocated to any experiment.
func (e *ExperimentAssignments) Snapshot(subjectID string) (SystemState, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	for _, experiment := range e.deterministic {
		if subjects := e.assignments[experiment]; subjects != nil {
			if _, ok := subjects[subjectID]; ok {
				return SystemState{System: e.Name(), SubjectPresent: true, Details: fmt.Sprintf("subject present in %s", experiment)}, nil
			}
		}
	}
	return SystemState{System: e.Name(), SubjectPresent: false, Details: "subject absent"}, nil
}

// FeatureMaterializer re-computes feature sets without the subject.
type FeatureMaterializer struct {
	mu       sync.Mutex
	features map[string]map[string]struct{}
	ordered  []string
}

// NewFeatureMaterializer creates a feature materializer with deterministic ordering.
func NewFeatureMaterializer(features map[string]map[string]struct{}) *FeatureMaterializer {
	ordered := make([]string, 0, len(features))
	for feature := range features {
		ordered = append(ordered, feature)
	}
	sort.Strings(ordered)
	return &FeatureMaterializer{features: features, ordered: ordered}
}

func (f *FeatureMaterializer) Name() string { return "feature-materializer" }

func (f *FeatureMaterializer) Apply(event Event) (ActionResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	rebuilt := make([]string, 0)
	for _, feature := range f.ordered {
		subjects := f.features[feature]
		if subjects == nil {
			continue
		}
		if _, ok := subjects[event.SubjectID]; ok {
			delete(subjects, event.SubjectID)
			rebuilt = append(rebuilt, feature)
		}
	}

	action := "no features required re-materialization"
	status := "noop"
	if len(rebuilt) > 0 {
		action = fmt.Sprintf("re-materialized %d features", len(rebuilt))
		status = "success"
	}

	return ActionResult{
		System:  f.Name(),
		Action:  action,
		Status:  status,
		Details: strings.Join(rebuilt, ","),
	}, nil
}

func (f *FeatureMaterializer) Snapshot(subjectID string) (SystemState, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	for _, feature := range f.ordered {
		if subjects := f.features[feature]; subjects != nil {
			if _, ok := subjects[subjectID]; ok {
				return SystemState{System: f.Name(), SubjectPresent: true, Details: fmt.Sprintf("subject present in feature %s", feature)}, nil
			}
		}
	}
	return SystemState{System: f.Name(), SubjectPresent: false, Details: "subject absent"}, nil
}

// CacheInvalidator purges subject-specific cache entries.
type CacheInvalidator struct {
	mu       sync.Mutex
	caches   map[string]map[string]struct{}
	cacheIDs []string
}

// NewCacheInvalidator builds a cache invalidator with deterministic ordering.
func NewCacheInvalidator(caches map[string]map[string]struct{}) *CacheInvalidator {
	cacheIDs := make([]string, 0, len(caches))
	for cache := range caches {
		cacheIDs = append(cacheIDs, cache)
	}
	sort.Strings(cacheIDs)
	return &CacheInvalidator{caches: caches, cacheIDs: cacheIDs}
}

func (c *CacheInvalidator) Name() string { return "cache-invalidator" }

func (c *CacheInvalidator) Apply(event Event) (ActionResult, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	purged := make([]string, 0)
	for _, cache := range c.cacheIDs {
		entries := c.caches[cache]
		if entries == nil {
			continue
		}
		if _, ok := entries[event.SubjectID]; ok {
			delete(entries, event.SubjectID)
			purged = append(purged, cache)
		}
	}

	action := "no cache entries purged"
	status := "noop"
	if len(purged) > 0 {
		action = fmt.Sprintf("purged %d caches", len(purged))
		status = "success"
	}

	return ActionResult{
		System:  c.Name(),
		Action:  action,
		Status:  status,
		Details: strings.Join(purged, ","),
	}, nil
}

func (c *CacheInvalidator) Snapshot(subjectID string) (SystemState, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for _, cache := range c.cacheIDs {
		if entries := c.caches[cache]; entries != nil {
			if _, ok := entries[subjectID]; ok {
				return SystemState{System: c.Name(), SubjectPresent: true, Details: fmt.Sprintf("subject present in cache %s", cache)}, nil
			}
		}
	}
	return SystemState{System: c.Name(), SubjectPresent: false, Details: "subject absent"}, nil
}

// QueryRouter updates shard lookups so revoked subjects are no longer addressable.
type QueryRouter struct {
	mu     sync.Mutex
	routes map[string]string
}

// NewQueryRouter constructs a query router subsystem.
func NewQueryRouter(routes map[string]string) *QueryRouter {
	return &QueryRouter{routes: routes}
}

func (q *QueryRouter) Name() string { return "query-router" }

func (q *QueryRouter) Apply(event Event) (ActionResult, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	_, exists := q.routes[event.SubjectID]
	if exists {
		delete(q.routes, event.SubjectID)
		return ActionResult{System: q.Name(), Action: "removed subject route", Status: "success"}, nil
	}
	return ActionResult{System: q.Name(), Action: "subject route absent", Status: "noop"}, nil
}

func (q *QueryRouter) Snapshot(subjectID string) (SystemState, error) {
	q.mu.Lock()
	defer q.mu.Unlock()

	if _, ok := q.routes[subjectID]; ok {
		return SystemState{System: q.Name(), SubjectPresent: true, Details: "subject routing still configured"}, nil
	}
	return SystemState{System: q.Name(), SubjectPresent: false, Details: "subject absent"}, nil
}
