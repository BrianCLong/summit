package scanner

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/summit/sss/pkg/detectors"
	"github.com/summit/sss/pkg/engine"
	"github.com/summit/sss/pkg/models"
	"github.com/summit/sss/pkg/pr"
	"github.com/summit/sss/pkg/quarantine"
	"github.com/summit/sss/pkg/rotator"
)

// Options controls scanner behaviour.
type Options struct {
	Root             string
	EnableQuarantine bool
	EnableAutoRotate bool
}

// Scanner drives the detection engine across repositories and artifacts.
type Scanner struct {
	Engine         *engine.Engine
	Filter         detectors.FilterFunc
	Quarantine     *quarantine.Manager
	Rotator        *rotator.Manager
	Annotator      *pr.Annotator
	ProviderLookup map[string]rotator.Provider
}

// New creates a scanner with default provider lookups.
func New(e *engine.Engine) *Scanner {
	return &Scanner{
		Engine:         e,
		ProviderLookup: defaultProviderLookup(),
	}
}

// Scan executes the scanner against a root path (file or directory).
func (s *Scanner) Scan(opts Options) ([]models.Finding, error) {
	if s.Engine == nil {
		return nil, errors.New("scanner requires engine")
	}
	if opts.Root == "" {
		return nil, errors.New("scan root required")
	}
	info, err := os.Stat(opts.Root)
	if err != nil {
		return nil, err
	}

	var (
		findings    []models.Finding
		quarantined = make(map[string]bool)
	)
	emit := func(path string, data []byte) error {
		if s.Filter != nil && s.Filter(path, data) {
			return nil
		}
		f, err := s.Engine.Detect(path, data)
		if err != nil {
			return err
		}
		if len(f) == 0 {
			return nil
		}

		if opts.EnableQuarantine && s.Quarantine != nil && !quarantined[path] {
			if err := s.quarantineFile(path); err == nil {
				quarantined[path] = true
			}
		}

		for i := range f {
			if quarantined[path] {
				f[i].Quarantined = true
			}
			if opts.EnableAutoRotate && s.Rotator != nil {
				if provider, ok := s.ProviderLookup[strings.ToLower(f[i].SecretType)]; ok {
					if err := s.Rotator.Rotate(provider, f[i].SecretType, f[i].Match); err == nil {
						f[i].AutoRotated = true
					}
				}
			}
		}
		findings = append(findings, f...)
		return nil
	}

	if info.IsDir() {
		err = filepath.WalkDir(opts.Root, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if d.IsDir() {
				if strings.HasPrefix(d.Name(), ".") && d.Name() != "." {
					return filepath.SkipDir
				}
				return nil
			}
			if isSkippable(path) {
				return nil
			}
			data, err := os.ReadFile(path)
			if err != nil {
				return nil
			}
			return emit(path, data)
		})
		if err != nil {
			return findings, err
		}
	} else {
		data, err := os.ReadFile(opts.Root)
		if err != nil {
			return nil, err
		}
		if err := emit(opts.Root, data); err != nil {
			return nil, err
		}
	}

	if s.Annotator != nil {
		s.Annotator.Emit(findings)
	}

	return findings, nil
}

func (s *Scanner) quarantineFile(path string) error {
	if s.Quarantine == nil {
		return fmt.Errorf("quarantine disabled")
	}
	_, err := s.Quarantine.Quarantine(path)
	return err
}

func defaultProviderLookup() map[string]rotator.Provider {
	return map[string]rotator.Provider{
		"aws-access-key": rotator.ProviderAWS,
		"aws-secret-key": rotator.ProviderAWS,
		"slack-token":    rotator.ProviderSlack,
		"github-token":   rotator.ProviderGitHub,
		"google-api-key": rotator.ProviderGCP,
		"azure-sas":      rotator.ProviderAzure,
		"stripe-key":     rotator.ProviderStripe,
		"twilio-key":     rotator.ProviderTwilio,
	}
}

func isSkippable(path string) bool {
	lower := strings.ToLower(path)
	if strings.Contains(lower, ".git/") {
		return true
	}
	if strings.HasSuffix(lower, ".png") || strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") || strings.HasSuffix(lower, ".gif") {
		return true
	}
	return false
}
