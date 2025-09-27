package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ManifestStore is an ObjectStore that operates on JSON manifests on disk.
type ManifestStore struct {
	dir string
}

func NewManifestStore(dir string) *ManifestStore {
	return &ManifestStore{dir: dir}
}

func (m *ManifestStore) manifestPath(bucket string) string {
	return filepath.Join(m.dir, fmt.Sprintf("%s.json", bucket))
}

func (m *ManifestStore) load(bucket string) ([]Object, error) {
	path := m.manifestPath(bucket)
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read manifest: %w", err)
	}
	var objs []Object
	if err := json.Unmarshal(raw, &objs); err != nil {
		return nil, fmt.Errorf("unmarshal manifest: %w", err)
	}
	return objs, nil
}

func (m *ManifestStore) persist(bucket string, objs []Object) error {
	sort.Slice(objs, func(i, j int) bool { return objs[i].Key < objs[j].Key })
	raw, err := json.MarshalIndent(objs, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}
	if err := os.MkdirAll(m.dir, 0o755); err != nil {
		return fmt.Errorf("mkdir manifest dir: %w", err)
	}
	if err := os.WriteFile(m.manifestPath(bucket), raw, 0o644); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}
	return nil
}

func (m *ManifestStore) ListExpired(_ context.Context, bucket, prefix string, cutoff int64) ([]Object, error) {
	objs, err := m.load(bucket)
	if err != nil {
		return nil, err
	}
	var expired []Object
	for _, obj := range objs {
		if prefix != "" && !strings.HasPrefix(obj.Key, prefix) {
			continue
		}
		if obj.UpdatedAt <= cutoff {
			expired = append(expired, obj)
		}
	}
	return expired, nil
}

func (m *ManifestStore) Delete(_ context.Context, bucket string, keys []string) error {
	if len(keys) == 0 {
		return nil
	}
	objs, err := m.load(bucket)
	if err != nil {
		return err
	}
	keySet := make(map[string]struct{}, len(keys))
	for _, key := range keys {
		keySet[key] = struct{}{}
	}
	remaining := make([]Object, 0, len(objs))
	for _, obj := range objs {
		if _, ok := keySet[obj.Key]; ok {
			continue
		}
		remaining = append(remaining, obj)
	}
	return m.persist(bucket, remaining)
}

func (m *ManifestStore) PlanLifecycle(_ context.Context, bucket string, prefix string, days int) error {
	// No-op: manifests don't support lifecycle rules, but we keep the interface
	// to mirror S3 behavior.
	_ = bucket
	_ = prefix
	_ = days
	return nil
}
