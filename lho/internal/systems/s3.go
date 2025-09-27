package systems

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/summit/lho/internal/model"
)

type S3Object struct {
	Key          string
	Data         string
	Frozen       bool
	Snapshots    []string
	Tags         map[string]string
	Deleted      bool
	TTLDisabled  bool
	LastSnapshot string
}

type S3Fixture struct {
	mu      sync.RWMutex
	Bucket  string
	Objects map[string]*S3Object
}

func NewS3Fixture(bucket string, objects map[string]*S3Object) *S3Fixture {
	return &S3Fixture{Bucket: bucket, Objects: objects}
}

func (s *S3Fixture) Name() string { return "s3" }

func (s *S3Fixture) ApplyHold(ctx context.Context, scope model.Scope, freeze, snapshot bool, tags map[string]string, preventTTL bool) (Report, error) {
	select {
	case <-ctx.Done():
		return Report{}, ctx.Err()
	default:
	}

	ids := scope.Systems[s.Name()]
	if len(ids) == 0 {
		return Report{}, nil
	}

	report := Report{Tagged: make(map[string]map[string]string)}

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, id := range ids {
		obj, ok := s.Objects[id]
		if !ok {
			return Report{}, fmt.Errorf("s3 object %s not found", id)
		}

		if freeze {
			obj.Frozen = true
			report.FrozenResources = append(report.FrozenResources, id)
		}

		if snapshot {
			obj.LastSnapshot = obj.Data
			obj.Snapshots = append(obj.Snapshots, obj.Data)
			report.Snapshotted = append(report.Snapshotted, id)
		}

		if preventTTL {
			obj.TTLDisabled = true
		}

		if tags != nil {
			if obj.Tags == nil {
				obj.Tags = make(map[string]string)
			}
			report.Tagged[id] = make(map[string]string)
			for k, v := range tags {
				obj.Tags[k] = v
				report.Tagged[id][k] = v
			}
		}
	}

	report.FingerprintValues = s.fingerprint(ids)

	return report, nil
}

func (s *S3Fixture) Verify(ctx context.Context, scope model.Scope) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	ids := scope.Systems[s.Name()]
	for _, id := range ids {
		obj, ok := s.Objects[id]
		if !ok {
			return fmt.Errorf("s3 object %s missing during verification", id)
		}
		if obj.Deleted {
			return fmt.Errorf("s3 object %s deleted during hold", id)
		}
		if !obj.Frozen {
			return fmt.Errorf("s3 object %s thawed during hold", id)
		}
		if !obj.TTLDisabled {
			return fmt.Errorf("s3 object %s ttl re-enabled", id)
		}
	}
	return nil
}

func (s *S3Fixture) DeleteObject(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	obj, ok := s.Objects[id]
	if !ok {
		return fmt.Errorf("object %s not found", id)
	}
	if obj.Frozen {
		return fmt.Errorf("object %s is frozen under legal hold", id)
	}

	obj.Deleted = true
	return nil
}

func (s *S3Fixture) fingerprint(ids []string) []string {
	parts := make([]string, 0, len(ids))
	for _, id := range ids {
		if obj, ok := s.Objects[id]; ok {
			parts = append(parts, fmt.Sprintf("%s:%t:%t:%t", id, obj.Frozen, obj.TTLDisabled, obj.Deleted))
		} else {
			parts = append(parts, fmt.Sprintf("%s:missing", id))
		}
	}
	sort.Strings(parts)
	return parts
}
