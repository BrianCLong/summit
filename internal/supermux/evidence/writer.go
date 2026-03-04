package evidence

import (
	"encoding/json"
	"os"
	"path/filepath"
	"supermux/internal/supermux/mux"
	pkg "supermux/pkg/supermux"
	"sync"
)

type Writer struct {
	mu       sync.Mutex
	dir      string
	eventsF  *os.File
	manifest map[pkg.SessionID]string
}

func NewWriter(run pkg.RunID, baseDir string) (*Writer, error) {
	dir := filepath.Join(baseDir, string(run))
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	eventsF, err := os.Create(filepath.Join(dir, "events.jsonl"))
	if err != nil {
		return nil, err
	}

	return &Writer{
		dir:      dir,
		eventsF:  eventsF,
		manifest: make(map[pkg.SessionID]string),
	}, nil
}

func (w *Writer) Append(frame *mux.Frame) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	data, err := json.Marshal(frame)
	if err != nil {
		return err
	}

	_, err = w.eventsF.Write(append(data, '\n'))
	return err
}

func (w *Writer) WriteManifest() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	manifestF, err := os.Create(filepath.Join(w.dir, "manifest.json"))
	if err != nil {
		return err
	}
	defer manifestF.Close()

	encoder := json.NewEncoder(manifestF)
	return encoder.Encode(w.manifest)
}

func (w *Writer) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	return w.eventsF.Close()
}
