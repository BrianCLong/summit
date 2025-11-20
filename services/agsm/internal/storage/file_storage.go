package storage

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/summit/agsm/internal/metrics"
)

// FileStorage persists metrics state to a JSON file for dashboard consumption.
type FileStorage struct {
	path string
}

// NewFileStorage creates a storage backed by the provided file path.
func NewFileStorage(path string) *FileStorage {
	return &FileStorage{path: path}
}

// Load returns the existing metrics state, if present.
func (s *FileStorage) Load() (metrics.State, error) {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return metrics.State{}, nil
		}
		return metrics.State{}, fmt.Errorf("read metrics state: %w", err)
	}
	var state metrics.State
	if len(data) == 0 {
		return metrics.State{}, nil
	}
	if err := json.Unmarshal(data, &state); err != nil {
		return metrics.State{}, fmt.Errorf("parse metrics state: %w", err)
	}
	return state, nil
}

// Save writes the provided state atomically.
func (s *FileStorage) Save(state metrics.State) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return fmt.Errorf("ensure metrics directory: %w", err)
	}
	payload, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("serialise metrics state: %w", err)
	}
	tmpPath := s.path + ".tmp"
	if err := os.WriteFile(tmpPath, payload, 0o644); err != nil {
		return fmt.Errorf("write temp metrics: %w", err)
	}
	if err := os.Rename(tmpPath, s.path); err != nil {
		return fmt.Errorf("atomically persist metrics: %w", err)
	}
	return nil
}

// Path exposes the backing file path.
func (s *FileStorage) Path() string {
	return s.path
}
