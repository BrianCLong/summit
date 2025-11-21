package sdn

import (
	"math/rand"
	"testing"
	"time"
)

func sampleBaseView() GraphView {
	view := NewGraphView()
	view.Clock.Value = 42
	motif := Motif{
		Name:       "supply-loop",
		Nodes:      []string{"analytics", "marketing", "sales"},
		Edges:      []Edge{{A: "analytics", B: "marketing"}, {A: "marketing", B: "sales"}, {A: "analytics", B: "sales"}},
		Attributes: map[string]string{"intent": "growth", "shape": "triangle"},
	}
	view.Motifs[motif.Key()] = motif
	view.Causality["marketing|sales"] = CausalityRelation{
		Entities:  [2]string{"marketing", "sales"},
		Direction: DirectionForward,
		Polarity:  PolarityPositive,
		Metadata:  map[string]string{"evidence": "campaign"},
	}
	view.Contradictions["forecast|reality"] = Contradiction{
		Statements: [2]string{"forecast", "reality"},
		Status:     ContradictionOpen,
		Metadata:   map[string]string{"owner": "ops"},
	}
	return view
}

func TestComputeAndApplyDeltasLossless(t *testing.T) {
	oldView := sampleBaseView()
	newView := sampleBaseView()

	newView.Motifs = map[string]Motif{}
	growthLoop := Motif{
		Name:       "supply-loop",
		Nodes:      []string{"marketing", "sales", "success"},
		Edges:      []Edge{{A: "marketing", B: "success"}, {A: "sales", B: "success"}},
		Attributes: map[string]string{"intent": "retention"},
	}
	newView.Motifs[growthLoop.Key()] = growthLoop

	newView.Causality["marketing|sales"] = CausalityRelation{
		Entities:  [2]string{"marketing", "sales"},
		Direction: DirectionBackward,
		Polarity:  PolarityNegative,
		Metadata:  map[string]string{"evidence": "postmortem"},
	}

	newView.Contradictions["forecast|reality"] = Contradiction{
		Statements: [2]string{"forecast", "reality"},
		Status:     ContradictionResolved,
		Metadata:   map[string]string{"owner": "ops", "note": "validated"},
	}

	deltas, err := ComputeDeltas(oldView, newView)
	if err != nil {
		t.Fatalf("ComputeDeltas error: %v", err)
	}

	reconstructed, err := ApplyDeltas(oldView, deltas)
	if err != nil {
		t.Fatalf("ApplyDeltas error: %v", err)
	}

	if Fingerprint(reconstructed) != Fingerprint(newView) {
		t.Fatalf("expected fingerprints to match after reconstruction")
	}
}

func TestDeterministicConflictMerge(t *testing.T) {
	base := sampleBaseView()

	branchA := sampleBaseView()
	branchA.Contradictions["forecast|reality"] = Contradiction{
		Statements: [2]string{"forecast", "reality"},
		Status:     ContradictionEscalated,
		Metadata:   map[string]string{"owner": "ops", "severity": "high"},
	}

	branchB := sampleBaseView()
	branchB.Contradictions["forecast|reality"] = Contradiction{
		Statements: [2]string{"forecast", "reality"},
		Status:     ContradictionResolved,
		Metadata:   map[string]string{"owner": "ops", "note": "accepted"},
	}

	deltasA, err := ComputeDeltas(base, branchA)
	if err != nil {
		t.Fatalf("ComputeDeltas branchA: %v", err)
	}
	for i := range deltasA {
		deltasA[i].Origin = "branchA"
	}

	deltasB, err := ComputeDeltas(base, branchB)
	if err != nil {
		t.Fatalf("ComputeDeltas branchB: %v", err)
	}
	for i := range deltasB {
		deltasB[i].Origin = "branchB"
	}

	mergedAB, err := ApplyDeltas(base, append(append([]Delta(nil), deltasA...), deltasB...))
	if err != nil {
		t.Fatalf("ApplyDeltas mergedAB: %v", err)
	}
	mergedBA, err := ApplyDeltas(base, append(append([]Delta(nil), deltasB...), deltasA...))
	if err != nil {
		t.Fatalf("ApplyDeltas mergedBA: %v", err)
	}

	if Fingerprint(mergedAB) != Fingerprint(mergedBA) {
		t.Fatalf("deterministic merge expectation violated")
	}
}

func TestOutOfOrderArrival(t *testing.T) {
	oldView := sampleBaseView()
	updated := sampleBaseView()
	updated.Causality["marketing|sales"] = CausalityRelation{
		Entities:  [2]string{"marketing", "sales"},
		Direction: DirectionBackward,
		Polarity:  PolarityPositive,
		Metadata:  map[string]string{"evidence": "retro"},
	}

	deltas, err := ComputeDeltas(oldView, updated)
	if err != nil {
		t.Fatalf("ComputeDeltas error: %v", err)
	}

	shuffled := append([]Delta(nil), deltas...)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	r.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	applied, err := ApplyDeltas(oldView, shuffled)
	if err != nil {
		t.Fatalf("ApplyDeltas error: %v", err)
	}
	if Fingerprint(applied) != Fingerprint(updated) {
		t.Fatalf("out-of-order application should match target view")
	}
}

func TestFingerprintIsomorphic(t *testing.T) {
	motif := Motif{
		Name:       "feedback",
		Nodes:      []string{"z", "a", "m"},
		Edges:      []Edge{{A: "z", B: "m"}, {A: "m", B: "a"}, {A: "z", B: "a"}},
		Attributes: map[string]string{"weight": "3"},
	}
	viewA := NewGraphView()
	viewA.Motifs[motif.Key()] = motif

	viewB := NewGraphView()
	viewB.Motifs[motif.Key()] = Motif{
		Name:       "feedback",
		Nodes:      []string{"a", "m", "z"},
		Edges:      []Edge{{A: "m", B: "z"}, {A: "a", B: "z"}, {A: "a", B: "m"}},
		Attributes: map[string]string{"weight": "3"},
	}

	if Fingerprint(viewA) != Fingerprint(viewB) {
		t.Fatalf("isomorphic motifs should share fingerprints")
	}
}

func TestWireFormatRoundTrip(t *testing.T) {
	base := sampleBaseView()
	next := sampleBaseView()
	next.Causality["marketing|sales"] = CausalityRelation{
		Entities:  [2]string{"marketing", "sales"},
		Direction: DirectionBidirectional,
		Polarity:  PolarityNeutral,
		Metadata:  map[string]string{"evidence": "bi"},
	}

	deltas, err := ComputeDeltas(base, next)
	if err != nil {
		t.Fatalf("ComputeDeltas error: %v", err)
	}

	payload, hash, err := EncodeDeltasToWire(deltas)
	if err != nil {
		t.Fatalf("EncodeDeltasToWire error: %v", err)
	}
	decoded, err := DecodeDeltasFromWire(payload, hash)
	if err != nil {
		t.Fatalf("DecodeDeltasFromWire error: %v", err)
	}

	reconstructed, err := ApplyDeltas(base, decoded)
	if err != nil {
		t.Fatalf("ApplyDeltas error: %v", err)
	}

	if Fingerprint(reconstructed) != Fingerprint(next) {
		t.Fatalf("wire round trip lost information")
	}
}
