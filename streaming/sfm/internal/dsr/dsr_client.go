package dsr

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Condition describes a simple attribute equality rule.
type Condition struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// Slice represents a named grouping defined in the DSR export.
type Slice struct {
	Name       string      `json:"name"`
	Conditions []Condition `json:"conditions"`
}

// RegistryConfig models the JSON configuration file consumed by the lightweight DSR client.
type RegistryConfig struct {
	UpdatedAt time.Time `json:"updated_at"`
	Slices    []Slice   `json:"slices"`
}

// FileBackedResolver loads slice definitions from a deterministic registry artifact.
type FileBackedResolver struct {
	path      string
	mu        sync.RWMutex
	config    RegistryConfig
	lastError error
}

// NewFileBackedResolver initialises a resolver using the provided path.
func NewFileBackedResolver(path string) (*FileBackedResolver, error) {
	resolver := &FileBackedResolver{path: path}
	if err := resolver.reload(); err != nil {
		return nil, err
	}
	return resolver, nil
}

// Resolve implements core.SliceResolver by matching attributes against configured slices.
func (r *FileBackedResolver) Resolve(attrs map[string]string) ([]string, error) {
	r.mu.RLock()
	cfg := r.config
	err := r.lastError
	r.mu.RUnlock()
	if err != nil {
		return nil, err
	}
	matches := make([]string, 0, len(cfg.Slices))
	for _, slice := range cfg.Slices {
		if satisfies(attrs, slice.Conditions) {
			matches = append(matches, slice.Name)
		}
	}
	return matches, nil
}

// Reload updates the registry contents from disk.
func (r *FileBackedResolver) Reload() error {
	return r.reload()
}

// Config returns the current registry configuration.
func (r *FileBackedResolver) Config() RegistryConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.config
}

func (r *FileBackedResolver) reload() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	abs, err := filepath.Abs(r.path)
	if err != nil {
		r.lastError = err
		return err
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		r.lastError = err
		return err
	}
	var cfg RegistryConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		r.lastError = err
		return err
	}
	if cfg.Slices == nil {
		cfg.Slices = []Slice{}
	}
	r.config = cfg
	r.lastError = nil
	return nil
}

func satisfies(attrs map[string]string, conditions []Condition) bool {
	if len(conditions) == 0 {
		return false
	}
	if attrs == nil {
		return false
	}
	for _, cond := range conditions {
		if v, ok := attrs[cond.Key]; !ok || v != cond.Value {
			return false
		}
	}
	return true
}

// MustNewResolver returns a resolver or panics (used by CLI wiring).
func MustNewResolver(path string) *FileBackedResolver {
	resolver, err := NewFileBackedResolver(path)
	if err != nil {
		panic(err)
	}
	return resolver
}
