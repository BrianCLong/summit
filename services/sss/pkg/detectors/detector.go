package detectors

import "github.com/summit/sss/pkg/models"

// Detector defines the contract for every detection strategy used by the engine.
type Detector interface {
	Detect(path string, content []byte) ([]models.Finding, error)
	Name() string
}

// FilterFunc allows callers to skip files before scanning.
type FilterFunc func(path string, content []byte) bool
