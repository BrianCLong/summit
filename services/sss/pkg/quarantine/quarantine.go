package quarantine

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// Manager moves suspect files into a quarantine directory for manual review.
type Manager struct {
	Root string
	Out  io.Writer
}

// New creates a new Manager with the provided root directory.
func New(root string, out io.Writer) (*Manager, error) {
	if root == "" {
		return nil, fmt.Errorf("quarantine root required")
	}
	if err := os.MkdirAll(root, 0o750); err != nil {
		return nil, fmt.Errorf("create quarantine root: %w", err)
	}
	return &Manager{Root: root, Out: out}, nil
}

// Quarantine moves the file to the quarantine root, preserving relative structure.
func (m *Manager) Quarantine(path string) (string, error) {
	if m == nil {
		return "", fmt.Errorf("quarantine manager not configured")
	}
	stat, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	if stat.IsDir() {
		return "", fmt.Errorf("cannot quarantine directory: %s", path)
	}
	rel := filepath.Base(path)
	stamp := time.Now().UTC().Format("20060102T150405Z")
	dest := filepath.Join(m.Root, fmt.Sprintf("%s.%s", rel, stamp))
	if err := os.Rename(path, dest); err != nil {
		return "", fmt.Errorf("move to quarantine: %w", err)
	}
	if m.Out != nil {
		fmt.Fprintf(m.Out, "[sss] quarantined %s -> %s\n", path, dest)
	}
	return dest, nil
}
