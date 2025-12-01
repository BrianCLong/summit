package sdn

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
)

// DeltaKind enumerates the high-level semantic change categories.
type DeltaKind string

const (
	DeltaMotif         DeltaKind = "motif"
	DeltaCausality     DeltaKind = "causality"
	DeltaContradiction DeltaKind = "contradiction"
)

// MotifOperation captures how a motif is affected by the delta.
type MotifOperation string

const (
	MotifUpsert MotifOperation = "upsert"
	MotifRemove MotifOperation = "remove"
)

// CausalityOperation captures semantic adjustments to causal relationships.
type CausalityOperation string

const (
	CausalityUpsert CausalityOperation = "upsert"
	CausalityRemove CausalityOperation = "remove"
	CausalityFlip   CausalityOperation = "flip"
)

// ContradictionOperation captures updates to contradictions.
type ContradictionOperation string

const (
	ContradictionUpsert ContradictionOperation = "upsert"
	ContradictionRemove ContradictionOperation = "remove"
)

// MotifChangeDelta encodes a structural motif adjustment.
type MotifChangeDelta struct {
	Key       string         `json:"key"`
	Operation MotifOperation `json:"op"`
	Motif     Motif          `json:"motif,omitempty"`
}

// CausalityDelta encodes causality flips or updates.
type CausalityDelta struct {
	Key       string             `json:"key"`
	Operation CausalityOperation `json:"op"`
	Direction Direction          `json:"direction,omitempty"`
	Polarity  Polarity           `json:"polarity,omitempty"`
	Metadata  map[string]string  `json:"metadata,omitempty"`
}

// ContradictionDelta encodes contradiction lifecycle changes.
type ContradictionDelta struct {
	Key       string                 `json:"key"`
	Operation ContradictionOperation `json:"op"`
	Status    ContradictionStatus    `json:"status,omitempty"`
	Metadata  map[string]string      `json:"metadata,omitempty"`
}

// Delta is the transport structure for semantic graph changes.
type Delta struct {
	ID            string              `json:"id"`
	Kind          DeltaKind           `json:"kind"`
	LamportTime   uint64              `json:"lamport"`
	Origin        string              `json:"origin,omitempty"`
	Motif         *MotifChangeDelta   `json:"motif,omitempty"`
	Causality     *CausalityDelta     `json:"causality,omitempty"`
	Contradiction *ContradictionDelta `json:"contradiction,omitempty"`
	IntegrityHash string              `json:"integrity"`
}

func newDelta(kind DeltaKind, lamport uint64, payload any) (Delta, error) {
	d := Delta{Kind: kind, LamportTime: lamport}
	switch v := payload.(type) {
	case MotifChangeDelta:
		v.Motif = v.Motif.Canonical()
		if v.Key == "" && v.Operation != MotifRemove {
			v.Key = v.Motif.Key()
		}
		d.Motif = &v
	case CausalityDelta:
		if v.Metadata != nil {
			v.Metadata = copyStringMap(v.Metadata)
		}
		d.Causality = &v
	case ContradictionDelta:
		if v.Metadata != nil {
			v.Metadata = copyStringMap(v.Metadata)
		}
		d.Contradiction = &v
	default:
		return Delta{}, fmt.Errorf("unsupported payload type %T", payload)
	}
	integritySource, err := json.Marshal(struct {
		Kind        DeltaKind `json:"kind"`
		LamportTime uint64    `json:"lamport"`
		Payload     any       `json:"payload"`
	}{Kind: d.Kind, LamportTime: d.LamportTime, Payload: payload})
	if err != nil {
		return Delta{}, err
	}
	hash := sha256.Sum256(integritySource)
	d.IntegrityHash = hex.EncodeToString(hash[:])

	idSource := struct {
		Kind DeltaKind `json:"kind"`
		Hash string    `json:"hash"`
	}{Kind: d.Kind, Hash: d.IntegrityHash}
	raw, err := json.Marshal(idSource)
	if err != nil {
		return Delta{}, err
	}
	sum := sha256.Sum256(raw)
	d.ID = hex.EncodeToString(sum[:])
	return d, nil
}

// ComputeDeltas calculates semantic differences between two views.
func ComputeDeltas(oldView, newView GraphView) ([]Delta, error) {
	oldNormalized := normalizeView(oldView)
	newNormalized := normalizeView(newView)

	clock := LamportClock{Value: maxUint64(oldNormalized.Clock.Value, newNormalized.Clock.Value)}
	var deltas []Delta

	for key, motif := range newNormalized.Motifs {
		if existing, ok := oldNormalized.Motifs[key]; !ok {
			delta, err := newDelta(DeltaMotif, clock.Next(), MotifChangeDelta{
				Key:       key,
				Operation: MotifUpsert,
				Motif:     motif,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		} else if !existing.Equal(motif) {
			delta, err := newDelta(DeltaMotif, clock.Next(), MotifChangeDelta{
				Key:       key,
				Operation: MotifUpsert,
				Motif:     motif,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		}
	}
	for key := range oldNormalized.Motifs {
		if _, ok := newNormalized.Motifs[key]; !ok {
			delta, err := newDelta(DeltaMotif, clock.Next(), MotifChangeDelta{
				Key:       key,
				Operation: MotifRemove,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		}
	}

	for key, relation := range newNormalized.Causality {
		existing, ok := oldNormalized.Causality[key]
		switch {
		case !ok:
			delta, err := newDelta(DeltaCausality, clock.Next(), CausalityDelta{
				Key:       key,
				Operation: CausalityUpsert,
				Direction: relation.Direction,
				Polarity:  relation.Polarity,
				Metadata:  relation.Metadata,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		case ok && existing.Direction != relation.Direction:
			delta, err := newDelta(DeltaCausality, clock.Next(), CausalityDelta{
				Key:       key,
				Operation: CausalityFlip,
				Direction: relation.Direction,
				Polarity:  relation.Polarity,
				Metadata:  relation.Metadata,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		case ok && (!existing.Equal(relation)):
			delta, err := newDelta(DeltaCausality, clock.Next(), CausalityDelta{
				Key:       key,
				Operation: CausalityUpsert,
				Direction: relation.Direction,
				Polarity:  relation.Polarity,
				Metadata:  relation.Metadata,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		}
	}
	for key := range oldNormalized.Causality {
		if _, ok := newNormalized.Causality[key]; !ok {
			delta, err := newDelta(DeltaCausality, clock.Next(), CausalityDelta{
				Key:       key,
				Operation: CausalityRemove,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		}
	}

	for key, contradiction := range newNormalized.Contradictions {
		if existing, ok := oldNormalized.Contradictions[key]; !ok {
			delta, err := newDelta(DeltaContradiction, clock.Next(), ContradictionDelta{
				Key:       key,
				Operation: ContradictionUpsert,
				Status:    contradiction.Status,
				Metadata:  contradiction.Metadata,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		} else if !existing.Equal(contradiction) {
			delta, err := newDelta(DeltaContradiction, clock.Next(), ContradictionDelta{
				Key:       key,
				Operation: ContradictionUpsert,
				Status:    contradiction.Status,
				Metadata:  contradiction.Metadata,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		}
	}
	for key := range oldNormalized.Contradictions {
		if _, ok := newNormalized.Contradictions[key]; !ok {
			delta, err := newDelta(DeltaContradiction, clock.Next(), ContradictionDelta{
				Key:       key,
				Operation: ContradictionRemove,
			})
			if err != nil {
				return nil, err
			}
			deltas = append(deltas, delta)
		}
	}

	sort.Slice(deltas, func(i, j int) bool {
		if deltas[i].LamportTime == deltas[j].LamportTime {
			return deltas[i].ID < deltas[j].ID
		}
		return deltas[i].LamportTime < deltas[j].LamportTime
	})
	return deltas, nil
}

// ApplyDeltas applies semantic deltas to the given view and returns the resulting state.
func ApplyDeltas(view GraphView, deltas []Delta) (GraphView, error) {
	current := normalizeView(view)
	if current.Motifs == nil {
		current.Motifs = make(map[string]Motif)
	}
	if current.Causality == nil {
		current.Causality = make(map[string]CausalityRelation)
	}
	if current.Contradictions == nil {
		current.Contradictions = make(map[string]Contradiction)
	}

	sort.Slice(deltas, func(i, j int) bool {
		if deltas[i].LamportTime == deltas[j].LamportTime {
			return deltas[i].ID < deltas[j].ID
		}
		return deltas[i].LamportTime < deltas[j].LamportTime
	})

	for _, delta := range deltas {
		current.Clock.Merge(delta.LamportTime)
		switch delta.Kind {
		case DeltaMotif:
			if delta.Motif == nil {
				return GraphView{}, errors.New("motif delta missing payload")
			}
			switch delta.Motif.Operation {
			case MotifUpsert:
				motif := delta.Motif.Motif.Canonical()
				key := delta.Motif.Key
				if key == "" {
					key = motif.Key()
				}
				current.Motifs[key] = motif
			case MotifRemove:
				delete(current.Motifs, delta.Motif.Key)
			default:
				return GraphView{}, fmt.Errorf("unknown motif operation %s", delta.Motif.Operation)
			}
		case DeltaCausality:
			if delta.Causality == nil {
				return GraphView{}, errors.New("causality delta missing payload")
			}
			key := delta.Causality.Key
			switch delta.Causality.Operation {
			case CausalityUpsert:
				relation := current.Causality[key]
				entities := parsePairKey(key)
				relation.Entities = entities
				relation.Direction = delta.Causality.Direction
				relation.Polarity = delta.Causality.Polarity
				relation.Metadata = copyStringMap(delta.Causality.Metadata)
				current.Causality[key] = relation.Canonical()
			case CausalityFlip:
				relation := current.Causality[key]
				if relation.Entities == [2]string{} {
					relation.Entities = parsePairKey(key)
				}
				relation.Direction = delta.Causality.Direction
				if delta.Causality.Polarity != "" {
					relation.Polarity = delta.Causality.Polarity
				}
				if delta.Causality.Metadata != nil {
					relation.Metadata = copyStringMap(delta.Causality.Metadata)
				}
				current.Causality[key] = relation.Canonical()
			case CausalityRemove:
				delete(current.Causality, key)
			default:
				return GraphView{}, fmt.Errorf("unknown causality operation %s", delta.Causality.Operation)
			}
		case DeltaContradiction:
			if delta.Contradiction == nil {
				return GraphView{}, errors.New("contradiction delta missing payload")
			}
			key := delta.Contradiction.Key
			switch delta.Contradiction.Operation {
			case ContradictionUpsert:
				contradiction := current.Contradictions[key]
				contradiction.Statements = parsePairKey(key)
				contradiction.Status = delta.Contradiction.Status
				contradiction.Metadata = copyStringMap(delta.Contradiction.Metadata)
				current.Contradictions[key] = contradiction.Canonical()
			case ContradictionRemove:
				delete(current.Contradictions, key)
			default:
				return GraphView{}, fmt.Errorf("unknown contradiction operation %s", delta.Contradiction.Operation)
			}
		default:
			return GraphView{}, fmt.Errorf("unknown delta kind %s", delta.Kind)
		}
	}
	return current, nil
}

func parsePairKey(key string) [2]string {
	parts := [2]string{"", ""}
	split := splitKey(key)
	if len(split) >= 2 {
		parts[0], parts[1] = split[0], split[1]
	}
	return parts
}

func splitKey(key string) []string {
	if key == "" {
		return nil
	}
	return strings.SplitN(key, "|", 3)
}

func maxUint64(a, b uint64) uint64 {
	if a > b {
		return a
	}
	return b
}
