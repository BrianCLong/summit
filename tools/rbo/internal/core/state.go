package core

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"sort"

	"github.com/summit/rbo/internal/dag"
	"github.com/summit/rbo/internal/model"
)

// Dependency defines a relation from an artifact to another artifact it depends on.
type Dependency struct {
	From model.ArtifactKey `json:"from"`
	To   model.ArtifactKey `json:"to"`
}

// RawState mirrors the persisted layout for state files.
type RawState struct {
	Artifacts    []*model.ArtifactState `json:"artifacts" yaml:"artifacts"`
	Dependencies []Dependency           `json:"dependencies" yaml:"dependencies"`
}

// SystemState aggregates artifacts and dependency graph.
type SystemState struct {
	Artifacts map[model.ArtifactKey]*model.ArtifactState
	Graph     *dag.DAG
}

// LoadState reads system state from the provided reader.
func LoadState(r io.Reader) (*SystemState, error) {
	var raw RawState
	dec := json.NewDecoder(r)
	if err := dec.Decode(&raw); err != nil {
		return nil, fmt.Errorf("decode state: %w", err)
	}
	return NewSystemState(raw)
}

// LoadStateFromFile loads a system state from a JSON file.
func LoadStateFromFile(path string) (*SystemState, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return LoadState(f)
}

// NewSystemState constructs an in-memory state from raw data.
func NewSystemState(raw RawState) (*SystemState, error) {
	artifacts := make(map[model.ArtifactKey]*model.ArtifactState, len(raw.Artifacts))
	for _, art := range raw.Artifacts {
		if art.Key == "" {
			art.Key = model.MakeKey(model.ArtifactRef{Type: art.Type, Name: art.Name})
		}
		artifacts[art.Key] = art
	}

	g := dag.New()
	for key := range artifacts {
		g.EnsureNode(string(key))
	}

	for _, dep := range raw.Dependencies {
		if dep.From == "" || dep.To == "" {
			return nil, errors.New("dependency missing from/to key")
		}
		if _, ok := artifacts[dep.From]; !ok {
			return nil, fmt.Errorf("unknown artifact %s in dependency", dep.From)
		}
		if _, ok := artifacts[dep.To]; !ok {
			return nil, fmt.Errorf("unknown dependency target %s", dep.To)
		}
		if err := g.AddEdge(string(dep.From), string(dep.To)); err != nil {
			return nil, err
		}
	}

	return &SystemState{Artifacts: artifacts, Graph: g}, nil
}

// Clone returns a deep copy of the system state.
func (s *SystemState) Clone() *SystemState {
	cp := &SystemState{Artifacts: make(map[model.ArtifactKey]*model.ArtifactState, len(s.Artifacts)), Graph: s.Graph.Clone()}
	for k, v := range s.Artifacts {
		cp.Artifacts[k] = v.Clone()
	}
	return cp
}

// Artifact returns the artifact state by reference.
func (s *SystemState) Artifact(ref model.ArtifactRef) (*model.ArtifactState, bool) {
	art, ok := s.Artifacts[model.MakeKey(ref)]
	return art, ok
}

// Keys returns the sorted artifact keys.
func (s *SystemState) Keys() []model.ArtifactKey {
	keys := make([]model.ArtifactKey, 0, len(s.Artifacts))
	for key := range s.Artifacts {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
	return keys
}

// Save writes the system state back to disk.
func (s *SystemState) Save(path string) error {
	raw := RawState{Artifacts: make([]*model.ArtifactState, 0, len(s.Artifacts))}
	for _, key := range s.Keys() {
		raw.Artifacts = append(raw.Artifacts, s.Artifacts[key])
	}
	raw.Dependencies = make([]Dependency, 0)
	for _, edge := range s.Graph.Edges() {
		raw.Dependencies = append(raw.Dependencies, Dependency{From: model.ArtifactKey(edge.From), To: model.ArtifactKey(edge.To)})
	}
	data, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal state: %w", err)
	}
	return os.WriteFile(path, data, 0o644)
}
