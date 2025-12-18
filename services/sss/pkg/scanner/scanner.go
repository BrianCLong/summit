package scanner

import (
	"bytes"
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
	MaxFileSize      int64 // MaxFileSize in bytes. 0 uses default (10MB). Negative values mean unlimited.
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

const (
	defaultMaxFileSize = 10 * 1024 * 1024 // 10MB
)

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

	// Set max file size. 0 = default, < 0 = unlimited.
	maxSize := opts.MaxFileSize
	if maxSize == 0 {
		maxSize = defaultMaxFileSize
	}

	info, err := os.Stat(opts.Root)
	if err != nil {
		return nil, err
	}

	var (
		findings    []models.Finding
		quarantined = make(map[string]bool)
	)

	// emit is a helper to process a single file's content
	emit := func(path string, data []byte) error {
		if s.Filter != nil && s.Filter(path, data) {
			return nil
		}

		// Binary check
		if isBinary(data) {
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

	// processFile handles reading and checking file limits
	processFile := func(path string) error {
		fInfo, err := os.Stat(path)
		if err != nil {
			return nil // Skip unreadable files
		}

		// Check size limit if not unlimited (negative)
		if maxSize > 0 && fInfo.Size() > maxSize {
			return nil // Skip huge files
		}

		if fInfo.Size() == 0 {
			return nil // Skip empty files
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return nil // Skip unreadable files
		}
		return emit(path, data)
	}

	if info.IsDir() {
		err = filepath.WalkDir(opts.Root, func(path string, d fs.DirEntry, walkErr error) error {
			if walkErr != nil {
				// Don't fail the entire walk for one error, just log/skip
				return nil
			}
			if d.IsDir() {
				// Skip hidden directories like .git
				if strings.HasPrefix(d.Name(), ".") && d.Name() != "." {
					return filepath.SkipDir
				}
				return nil
			}
			if isSkippable(path) {
				return nil
			}
			return processFile(path)
		})
		if err != nil {
			return findings, err
		}
	} else {
		if !isSkippable(opts.Root) {
			if err := processFile(opts.Root); err != nil {
				return nil, err
			}
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

// skippedExtensions is a set of extensions to ignore
var skippedExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true,
	".ico": true, ".pdf": true, ".zip": true, ".tar": true,
	".gz": true, ".exe": true, ".bin": true, ".dll": true,
	".so": true, ".dylib": true, ".woff": true, ".woff2": true,
	".ttf": true, ".eot": true, ".mp3": true, ".mp4": true,
	".mov": true, ".avi": true, ".webm": true, ".iso": true,
}

func isSkippable(path string) bool {
	// Check for .git directory in path components
	parts := strings.Split(filepath.ToSlash(path), "/")
	for _, p := range parts {
		if p == ".git" {
			return true
		}
	}

	ext := strings.ToLower(filepath.Ext(path))
	return skippedExtensions[ext]
}

// isBinary checks if the data looks like binary.
// It checks the first 1024 bytes for NUL bytes.
// It cautiously avoids utf8.Valid for short buffers to prevent false positives on split runes,
// relying primarily on NUL bytes which is standard for "is this a text file" heuristics.
func isBinary(data []byte) bool {
	if len(data) == 0 {
		return false
	}
	// Check first 1024 bytes (or less)
	limit := 1024
	if len(data) < limit {
		limit = len(data)
	}

	// Check for NUL byte
	if bytes.IndexByte(data[:limit], 0) != -1 {
		return true
	}

	// If we really wanted to check UTF-8 validity, we should handle the truncation case.
	// For now, NUL check covers the vast majority of binary file types we want to skip (images, compiled binaries).
	// Adding full UTF-8 validation on a truncated buffer is risky.
	// If we must check UTF-8, we should verify the prefix is valid UTF-8, ignoring the last few bytes if incomplete.

	// Let's stick to NUL check for safety and performance, as it's the most reliable indicator of "not text".
	// If it's valid text but weird encoding, regex might just fail to match, which is fine.

	return false
}
