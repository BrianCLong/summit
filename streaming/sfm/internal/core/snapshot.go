package core

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
)

// SnapshotSigner produces deterministic signatures for fairness snapshots.
type SnapshotSigner struct {
	seed string
}

// NewSnapshotSigner creates a signer that salts signatures with a deterministic seed.
func NewSnapshotSigner(seed string) *SnapshotSigner {
	return &SnapshotSigner{seed: seed}
}

// Sign encodes the snapshot deterministically and returns a hex signature.
func (s *SnapshotSigner) Sign(snapshot MetricSnapshot) (string, error) {
	payload, err := canonicalJSON(snapshot)
	if err != nil {
		return "", err
	}
	h := sha256.New()
	h.Write([]byte(s.seed))
	h.Write([]byte("::sfm::"))
	h.Write(payload)
	return hex.EncodeToString(h.Sum(nil)), nil
}

func canonicalJSON(snapshot MetricSnapshot) ([]byte, error) {
	type canonicalGroup struct {
		Group        string  `json:"group"`
		Support      int     `json:"support"`
		TP           int     `json:"tp"`
		FP           int     `json:"fp"`
		TN           int     `json:"tn"`
		FN           int     `json:"fn"`
		TPR          float64 `json:"tpr"`
		FPR          float64 `json:"fpr"`
		PositiveRate float64 `json:"positive_rate"`
		TopKRate     float64 `json:"top_k_rate"`
	}
	type canonicalSnapshot struct {
		WindowStart     string           `json:"window_start"`
		WindowEnd       string           `json:"window_end"`
		GroupMetrics    []canonicalGroup `json:"group_metrics"`
		TPRGap          float64          `json:"tpr_gap"`
		FPRGap          float64          `json:"fpr_gap"`
		DemographicDiff float64          `json:"demographic_parity_diff"`
		EqOppAtKDiff    float64          `json:"eq_opp_at_k_diff"`
	}

	groups := make([]canonicalGroup, len(snapshot.GroupMetrics))
	for i, g := range snapshot.GroupMetrics {
		groups[i] = canonicalGroup{
			Group:        g.Group,
			Support:      g.Support,
			TP:           g.TP,
			FP:           g.FP,
			TN:           g.TN,
			FN:           g.FN,
			TPR:          g.TPR,
			FPR:          g.FPR,
			PositiveRate: g.PositiveRate,
			TopKRate:     g.TopKRate,
		}
	}
	sort.Slice(groups, func(i, j int) bool { return groups[i].Group < groups[j].Group })

	snap := canonicalSnapshot{
		WindowStart:     snapshot.WindowStart.UTC().Format(timeLayout),
		WindowEnd:       snapshot.WindowEnd.UTC().Format(timeLayout),
		GroupMetrics:    groups,
		TPRGap:          snapshot.TPRGap,
		FPRGap:          snapshot.FPRGap,
		DemographicDiff: snapshot.DemographicDiff,
		EqOppAtKDiff:    snapshot.EqOppAtKDiff,
	}
	buf, err := json.Marshal(snap)
	if err != nil {
		return nil, err
	}
	return buf, nil
}

const timeLayout = "2006-01-02T15:04:05.000Z07:00"

// SnapshotEnvelope wraps a signed snapshot for API responses.
type SnapshotEnvelope struct {
	Snapshot  MetricSnapshot `json:"snapshot"`
	Signature string         `json:"signature"`
}

// EncodeEnvelope renders an envelope as pretty JSON suitable for storing snapshots.
func EncodeEnvelope(env SnapshotEnvelope) (string, error) {
	payload, err := canonicalJSON(env.Snapshot)
	if err != nil {
		return "", err
	}
	type canonicalEnvelope struct {
		Snapshot  json.RawMessage `json:"snapshot"`
		Signature string          `json:"signature"`
	}
	buf, err := json.Marshal(canonicalEnvelope{Snapshot: json.RawMessage(payload), Signature: env.Signature})
	if err != nil {
		return "", err
	}
	return string(buf), nil
}

// SnapshotDigest returns a compact digest for logging.
func SnapshotDigest(env SnapshotEnvelope) string {
	parts := []string{
		env.Snapshot.WindowEnd.UTC().Format(timeLayout),
		env.Signature[:12],
		strings.ReplaceAll(env.Snapshot.WindowStart.UTC().Format(timeLayout), "-", ""),
	}
	return strings.Join(parts, "|")
}
