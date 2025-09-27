package systems

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/summit/lho/internal/model"
)

type LifecycleObject struct {
	ID         string
	ExpiresAt  time.Time
	Held       bool
	Deleted    bool
	Attributes map[string]string
}

type LifecycleFixture struct {
	mu      sync.RWMutex
	Objects map[string]*LifecycleObject
}

func NewLifecycleFixture(objects map[string]*LifecycleObject) *LifecycleFixture {
	return &LifecycleFixture{Objects: objects}
}

func (l *LifecycleFixture) Name() string { return "lifecycle" }

func (l *LifecycleFixture) ApplyHold(ctx context.Context, scope model.Scope, freeze, snapshot bool, tags map[string]string, preventTTL bool) (Report, error) {
	select {
	case <-ctx.Done():
		return Report{}, ctx.Err()
	default:
	}

	ids := scope.Systems[l.Name()]
	if len(ids) == 0 {
		return Report{}, nil
	}

	report := Report{Tagged: make(map[string]map[string]string)}

	l.mu.Lock()
	defer l.mu.Unlock()

	for _, id := range ids {
		obj, ok := l.Objects[id]
		if !ok {
			return Report{}, fmt.Errorf("lifecycle object %s not found", id)
		}
		obj.Held = true
		report.FrozenResources = append(report.FrozenResources, id)
		if tags != nil {
			if obj.Attributes == nil {
				obj.Attributes = make(map[string]string)
			}
			report.Tagged[id] = make(map[string]string)
			for k, v := range tags {
				obj.Attributes[k] = v
				report.Tagged[id][k] = v
			}
		}
	}

	report.FingerprintValues = l.fingerprint(ids)

	return report, nil
}

func (l *LifecycleFixture) Verify(ctx context.Context, scope model.Scope) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	l.mu.RLock()
	defer l.mu.RUnlock()

	ids := scope.Systems[l.Name()]
	for _, id := range ids {
		obj, ok := l.Objects[id]
		if !ok {
			return fmt.Errorf("lifecycle object %s missing", id)
		}
		if obj.Deleted {
			return fmt.Errorf("lifecycle object %s deleted", id)
		}
		if !obj.Held {
			return fmt.Errorf("lifecycle object %s released", id)
		}
	}

	return nil
}

func (l *LifecycleFixture) ProcessExpirations(now time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()

	for _, obj := range l.Objects {
		if obj.Held {
			continue
		}
		if now.After(obj.ExpiresAt) && !obj.Deleted {
			obj.Deleted = true
		}
	}
}

func (l *LifecycleFixture) fingerprint(ids []string) []string {
	parts := make([]string, 0, len(ids))
	for _, id := range ids {
		obj, ok := l.Objects[id]
		if !ok {
			parts = append(parts, fmt.Sprintf("%s:missing", id))
			continue
		}
		parts = append(parts, fmt.Sprintf("%s:%t:%t", id, obj.Held, obj.Deleted))
	}
	sort.Strings(parts)
	return parts
}
