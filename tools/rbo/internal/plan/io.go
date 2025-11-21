package plan

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

// Save persists the rollback plan to a file as indented JSON.
func Save(p RollbackPlan, path string) error {
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal plan: %w", err)
	}
	return os.WriteFile(path, data, 0o644)
}

// Load reads a rollback plan from the provided reader.
func Load(r io.Reader) (RollbackPlan, error) {
	var p RollbackPlan
	dec := json.NewDecoder(r)
	if err := dec.Decode(&p); err != nil {
		return RollbackPlan{}, fmt.Errorf("decode plan: %w", err)
	}
	p.Normalize()
	return p, nil
}

// LoadFromFile loads a rollback plan from a path.
func LoadFromFile(path string) (RollbackPlan, error) {
	f, err := os.Open(path)
	if err != nil {
		return RollbackPlan{}, err
	}
	defer f.Close()
	return Load(f)
}
