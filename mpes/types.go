package mpes

import "time"

// Capability describes an action that a party's submission can request.
type Capability string

// ModelArtifact represents a submitted model along with its declared capabilities.
type ModelArtifact struct {
	Name         string
	Version      string
	Capabilities []Capability
	Payload      []byte
}

// Clone produces a deep copy of the model artifact to ensure sandbox isolation.
func (m ModelArtifact) Clone() ModelArtifact {
	clone := ModelArtifact{
		Name:         m.Name,
		Version:      m.Version,
		Capabilities: append([]Capability(nil), m.Capabilities...),
		Payload:      append([]byte(nil), m.Payload...),
	}
	return clone
}

// DataSlice represents a dataset shard submitted for evaluation.
type DataSlice struct {
	Name    string
	Records [][]byte
}

// Clone returns an isolated copy of the data slice.
func (d DataSlice) Clone() DataSlice {
	records := make([][]byte, len(d.Records))
	for i, r := range d.Records {
		records[i] = append([]byte(nil), r...)
	}
	return DataSlice{
		Name:    d.Name,
		Records: records,
	}
}

// Submission ties a party to a model/data bundle for evaluation.
type Submission struct {
	PartyID string
	Model   ModelArtifact
	Data    DataSlice
}

// Score represents the outcome of running a task.
type Score struct {
	Value    float64
	Evidence string
}

// EvalTask defines a pluggable evaluation job that can run inside a sandbox.
type EvalTask interface {
	Name() string
	Evaluate(model ModelArtifact, data DataSlice) (Score, error)
}

// Scorecard captures the signed results for a particular party.
type Scorecard struct {
	PartyID    string
	TaskScores map[string]Score
	Metadata   map[string]string
	CreatedAt  time.Time
	Signature  []byte
}

// CloneWithoutSignature is useful for testing isolation of metadata.
func (s Scorecard) CloneWithoutSignature() Scorecard {
	copyScores := make(map[string]Score, len(s.TaskScores))
	for k, v := range s.TaskScores {
		copyScores[k] = v
	}
	copyMetadata := make(map[string]string, len(s.Metadata))
	for k, v := range s.Metadata {
		copyMetadata[k] = v
	}
	return Scorecard{
		PartyID:    s.PartyID,
		TaskScores: copyScores,
		Metadata:   copyMetadata,
		CreatedAt:  s.CreatedAt,
	}
}
