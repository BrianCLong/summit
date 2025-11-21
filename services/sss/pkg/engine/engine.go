package engine

import (
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/summit/sss/pkg/detectors"
	"github.com/summit/sss/pkg/models"
)

// Engine coordinates detectors and produces consolidated findings.
type Engine struct {
	detectors []detectors.Detector
}

// New creates a new Engine instance.
func New(ds ...detectors.Detector) (*Engine, error) {
	if len(ds) == 0 {
		return nil, errors.New("engine requires at least one detector")
	}
	return &Engine{detectors: ds}, nil
}

// Detect runs every detector against the provided file contents.
func (e *Engine) Detect(path string, content []byte) ([]models.Finding, error) {
	var (
		wg       sync.WaitGroup
		mu       sync.Mutex
		findings []models.Finding
		errs     []error
	)

	wg.Add(len(e.detectors))
	for _, detector := range e.detectors {
		detector := detector
		go func() {
			defer wg.Done()
			out, err := detector.Detect(path, content)
			if err != nil {
				mu.Lock()
				errs = append(errs, fmt.Errorf("%s: %w", detector.Name(), err))
				mu.Unlock()
				return
			}
			mu.Lock()
			findings = append(findings, out...)
			mu.Unlock()
		}()
	}
	wg.Wait()

	if len(errs) > 0 {
		return findings, errors.Join(errs...)
	}

	sort.Slice(findings, func(i, j int) bool {
		if findings[i].FilePath == findings[j].FilePath {
			if findings[i].Line == findings[j].Line {
				return findings[i].RuleID < findings[j].RuleID
			}
			return findings[i].Line < findings[j].Line
		}
		return findings[i].FilePath < findings[j].FilePath
	})

	return findings, nil
}

// Detectors returns the underlying detectors.
func (e *Engine) Detectors() []detectors.Detector {
	return append([]detectors.Detector(nil), e.detectors...)
}
