package pbs

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sort"
)

// LoadHistory reads historical decisions from disk.
func LoadHistory(path string) ([]HistoricalDecision, string, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, "", fmt.Errorf("read history: %w", err)
	}
	var decisions []HistoricalDecision
	if err := json.Unmarshal(raw, &decisions); err != nil {
		return nil, "", fmt.Errorf("parse history: %w", err)
	}
	sort.SliceStable(decisions, func(i, j int) bool {
		if decisions[i].Timestamp == decisions[j].Timestamp {
			return decisions[i].ID < decisions[j].ID
		}
		return decisions[i].Timestamp < decisions[j].Timestamp
	})
	return decisions, computeDigest(raw), nil
}

// LoadPolicy loads a policy snapshot from disk.
func LoadPolicy(path string) (PolicySnapshot, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return PolicySnapshot{}, fmt.Errorf("read policy: %w", err)
	}
	var snapshot PolicySnapshot
	if err := json.Unmarshal(raw, &snapshot); err != nil {
		return PolicySnapshot{}, fmt.Errorf("parse policy: %w", err)
	}
	if _, err := NewEngine(snapshot); err != nil {
		return PolicySnapshot{}, err
	}
	return snapshot, nil
}

// WriteJSON writes indented JSON to the target path.
func WriteJSON(path string, payload any) error {
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal json: %w", err)
	}
	return os.WriteFile(path, data, 0o644)
}

// WriteText writes text content to disk.
func WriteText(path, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}

// ReadAll reads an io.Reader fully.
func ReadAll(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}
