package manifest

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"time"
)

// Manifest summarises replication results for auditing.
type Manifest struct {
	GeneratedAt time.Time                  `json:"generatedAt"`
	PolicyHash  string                     `json:"policyHash"`
	Streams     map[string]*StreamManifest `json:"streams"`
}

// StreamManifest captures per-stream stats and hashes.
type StreamManifest struct {
	Name          string `json:"name"`
	Table         string `json:"table"`
	SnapshotCount int    `json:"snapshotCount"`
	InsertCount   int    `json:"insertCount"`
	UpdateCount   int    `json:"updateCount"`
	DeleteCount   int    `json:"deleteCount"`
	RowHash       string `json:"rowHash"`
	HashAlgorithm string `json:"hashAlgorithm"`
	stateHasher   *sha256Hash
}

// New creates a manifest with the provided policy hash.
func New(policyHash string) *Manifest {
	return &Manifest{
		GeneratedAt: time.Now().UTC(),
		PolicyHash:  policyHash,
		Streams:     map[string]*StreamManifest{},
	}
}

// Stream returns the manifest for a stream, creating it if necessary.
func (m *Manifest) Stream(name, table string) *StreamManifest {
	if existing, ok := m.Streams[name]; ok {
		return existing
	}
	sm := &StreamManifest{
		Name:          name,
		Table:         table,
		HashAlgorithm: "sha256",
		stateHasher:   newHasher(),
	}
	m.Streams[name] = sm
	return sm
}

// Clone deep copies the manifest for reporting.
func (m *Manifest) Clone() *Manifest {
	out := &Manifest{
		GeneratedAt: m.GeneratedAt,
		PolicyHash:  m.PolicyHash,
		Streams:     make(map[string]*StreamManifest, len(m.Streams)),
	}
	for k, v := range m.Streams {
		out.Streams[k] = v.clone()
	}
	return out
}

// UpdateSnapshot increments counters and hashes for snapshot rows.
func (m *Manifest) UpdateSnapshot(streamName, table string, row map[string]any) {
	sm := m.Stream(streamName, table)
	sm.SnapshotCount++
	sm.updateHash(row)
}

// UpdateChange increments counters for change events.
func (m *Manifest) UpdateChange(streamName, table, changeType string, row map[string]any) {
	sm := m.Stream(streamName, table)
	switch changeType {
	case "insert":
		sm.InsertCount++
	case "update":
		sm.UpdateCount++
	case "delete":
		sm.DeleteCount++
	}
	sm.updateHash(row)
}

func (sm *StreamManifest) finalize() {
	if sm.stateHasher != nil {
		sm.RowHash = sm.stateHasher.sum()
		sm.stateHasher = nil
	}
}

func (sm *StreamManifest) updateHash(row map[string]any) {
	if sm.stateHasher == nil {
		sm.stateHasher = newHasher()
	}
	sm.stateHasher.writeRow(row)
	sm.RowHash = sm.stateHasher.sum()
}

func (sm *StreamManifest) clone() *StreamManifest {
	out := *sm
	out.stateHasher = nil
	return &out
}

// Finalize finalizes all stream hashes.
func (m *Manifest) Finalize() {
	for _, sm := range m.Streams {
		sm.finalize()
	}
}

type sha256Hash struct {
	rows [][]byte
}

func newHasher() *sha256Hash {
	return &sha256Hash{rows: make([][]byte, 0)}
}

func (h *sha256Hash) writeRow(row map[string]any) {
	if row == nil {
		return
	}
	canonical := canonicalJSON(row)
	h.rows = append(h.rows, canonical)
}

func (h *sha256Hash) sum() string {
	hasher := sha256.New()
	for _, row := range h.rows {
		hasher.Write(row)
	}
	return hex.EncodeToString(hasher.Sum(nil))
}

func canonicalJSON(row map[string]any) []byte {
	keys := make([]string, 0, len(row))
	for k := range row {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	pairs := make([]struct {
		Key   string      `json:"key"`
		Value interface{} `json:"value"`
	}, 0, len(keys))
	for _, k := range keys {
		pairs = append(pairs, struct {
			Key   string      `json:"key"`
			Value interface{} `json:"value"`
		}{Key: k, Value: row[k]})
	}
	bytes, _ := json.Marshal(pairs)
	return bytes
}
