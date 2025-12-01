package model

import "sort"

// ArtifactType enumerates supported artifact categories managed by the rollback orchestrator.
type ArtifactType string

const (
	ArtifactModel   ArtifactType = "model"
	ArtifactPolicy  ArtifactType = "policy"
	ArtifactDataset ArtifactType = "dataset"
	ArtifactCache   ArtifactType = "cache"
)

// ArtifactKey uniquely identifies an artifact by type and name.
type ArtifactKey string

// ArtifactRef is a human friendly reference for an artifact.
type ArtifactRef struct {
	Type ArtifactType `json:"type"`
	Name string       `json:"name"`
}

// ArtifactState represents the persisted status of an artifact.
type ArtifactState struct {
	Key ArtifactKey `json:"key"
                                     yaml:"key"`
	Type ArtifactType `json:"type"
                                     yaml:"type"`
	Name string `json:"name"
                                     yaml:"name"`
	CurrentVersion string `json:"currentVersion"
                                     yaml:"currentVersion"`
	LastGoodVersion string `json:"lastGoodVersion"
                                     yaml:"lastGoodVersion"`
	SyncedVersion string `json:"syncedVersion,omitempty"
                                     yaml:"syncedVersion,omitempty"`
	BackfillNeeded bool `json:"backfillNeeded,omitempty"
                                     yaml:"backfillNeeded,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"
                                     yaml:"metadata,omitempty"`
}

// Clone returns a deep copy of the artifact state.
func (a *ArtifactState) Clone() *ArtifactState {
	cp := *a
	if a.Metadata != nil {
		cp.Metadata = make(map[string]any, len(a.Metadata))
		for k, v := range a.Metadata {
			cp.Metadata[k] = v
		}
	}
	return &cp
}

// ArtifactList is a helper type for deterministic ordering operations.
type ArtifactList []*ArtifactState

// Sort sorts the artifact list by type then name.
func (l ArtifactList) Sort() {
	sort.SliceStable(l, func(i, j int) bool {
		if l[i].Type == l[j].Type {
			return l[i].Name < l[j].Name
		}
		return l[i].Type < l[j].Type
	})
}

// ToRefs returns the artifact references for the list.
func (l ArtifactList) ToRefs() []ArtifactRef {
	out := make([]ArtifactRef, len(l))
	for i, art := range l {
		out[i] = ArtifactRef{Type: art.Type, Name: art.Name}
	}
	return out
}

// MakeKey builds a canonical artifact key.
func MakeKey(ref ArtifactRef) ArtifactKey {
	return ArtifactKey(string(ref.Type) + ":" + ref.Name)
}

// ParseKey parses an artifact key to a reference.
func ParseKey(key ArtifactKey) ArtifactRef {
	s := string(key)
	for i := 0; i < len(s); i++ {
		if s[i] == ':' {
			return ArtifactRef{Type: ArtifactType(s[:i]), Name: s[i+1:]}
		}
	}
	return ArtifactRef{Name: s}
}
