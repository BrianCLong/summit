package evidence

import (
	"bufio"
	"encoding/json"
	"os"
	"supermux/internal/supermux/mux"
)

type Replay struct {
	file *os.File
	scanner *bufio.Scanner
}

func NewReplay(eventsFile string) (*Replay, error) {
	f, err := os.Open(eventsFile)
	if err != nil {
		return nil, err
	}

	return &Replay{
		file:    f,
		scanner: bufio.NewScanner(f),
	}, nil
}

func (r *Replay) Next() (*mux.Frame, error) {
	if !r.scanner.Scan() {
		if err := r.scanner.Err(); err != nil {
			return nil, err
		}
		return nil, nil // EOF
	}

	var frame mux.Frame
	if err := json.Unmarshal(r.scanner.Bytes(), &frame); err != nil {
		return nil, err
	}

	return &frame, nil
}

func (r *Replay) Close() error {
	return r.file.Close()
}
