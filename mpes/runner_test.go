package mpes

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"testing"
	"time"
)

type mutatingTask struct{}

func (mutatingTask) Name() string { return "mutating" }

func (mutatingTask) Evaluate(model ModelArtifact, data DataSlice) (Score, error) {
	if len(model.Payload) > 0 {
		model.Payload[0] = 'x'
	}
	if len(data.Records) > 0 && len(data.Records[0]) > 0 {
		data.Records[0][0] = 'y'
	}
	evidenceModel := string(model.Payload)
	evidenceData := ""
	if len(data.Records) > 0 {
		evidenceData = string(data.Records[0])
	}
	return Score{
		Value:    float64(len(model.Payload) + len(data.Records)),
		Evidence: "model=" + evidenceModel + ",data=" + evidenceData,
	}, nil
}

type hashTask struct{}

func (hashTask) Name() string { return "hash" }

func (hashTask) Evaluate(model ModelArtifact, data DataSlice) (Score, error) {
	hasher := sha256.New()
	hasher.Write(model.Payload)
	for _, record := range data.Records {
		hasher.Write(record)
	}
	sum := hasher.Sum(nil)
	value := binary.BigEndian.Uint64(sum[:8]) % 100000
	return Score{
		Value:    float64(value) / 100.0,
		Evidence: hex.EncodeToString(sum),
	}, nil
}

func fixedSigner(t *testing.T) *ScorecardSigner {
	t.Helper()
	seed := make([]byte, 32)
	for i := range seed {
		seed[i] = byte(i)
	}
	signer, err := NewScorecardSigner(seed)
	if err != nil {
		t.Fatalf("failed to create signer: %v", err)
	}
	return signer
}

func TestCrossPartyIsolation(t *testing.T) {
	policy := NewStaticPolicyFirewall(map[string][]Capability{
		"party-a": {Capability("compute")},
		"party-b": {Capability("compute")},
	})
	runner, err := NewRunner([]EvalTask{mutatingTask{}}, policy, fixedSigner(t), WithClock(func() time.Time {
		return time.Unix(100, 0)
	}))
	if err != nil {
		t.Fatalf("failed to create runner: %v", err)
	}

	originalModelA := ModelArtifact{Name: "modelA", Capabilities: []Capability{"compute"}, Payload: []byte("AAAA")}
	originalModelB := ModelArtifact{Name: "modelB", Capabilities: []Capability{"compute"}, Payload: []byte("BBBB")}
	originalDataA := DataSlice{Name: "dataA", Records: [][]byte{[]byte("aaaa")}}
	originalDataB := DataSlice{Name: "dataB", Records: [][]byte{[]byte("bbbb")}}

	submissions := []Submission{
		{PartyID: "party-a", Model: originalModelA, Data: originalDataA},
		{PartyID: "party-b", Model: originalModelB, Data: originalDataB},
	}

	results, err := runner.Run(context.Background(), submissions)
	if err != nil {
		t.Fatalf("runner execution failed: %v", err)
	}

	if string(originalModelA.Payload) != "AAAA" {
		t.Fatalf("modelA payload mutated outside sandbox: %s", originalModelA.Payload)
	}
	if string(originalModelB.Payload) != "BBBB" {
		t.Fatalf("modelB payload mutated outside sandbox: %s", originalModelB.Payload)
	}
	if string(originalDataA.Records[0]) != "aaaa" {
		t.Fatalf("dataA mutated outside sandbox: %s", originalDataA.Records[0])
	}
	if string(originalDataB.Records[0]) != "bbbb" {
		t.Fatalf("dataB mutated outside sandbox: %s", originalDataB.Records[0])
	}

	evidenceA := results["party-a"].TaskScores["mutating"].Evidence
	evidenceB := results["party-b"].TaskScores["mutating"].Evidence
	if evidenceA == evidenceB {
		t.Fatalf("evidence should be unique per party but matched: %s", evidenceA)
	}
	if len(results["party-a"].Metadata) == 0 || len(results["party-b"].Metadata) == 0 {
		t.Fatalf("metadata missing sandbox details")
	}
}

func TestIdenticalSubmissionsYieldIdenticalScores(t *testing.T) {
	policy := NewStaticPolicyFirewall(map[string][]Capability{
		"party-a": {Capability("compute")},
		"party-b": {Capability("compute")},
	})
	runner, err := NewRunner([]EvalTask{hashTask{}}, policy, fixedSigner(t))
	if err != nil {
		t.Fatalf("failed to create runner: %v", err)
	}

	model := ModelArtifact{Name: "shared", Capabilities: []Capability{"compute"}, Payload: []byte("MODEL")}
	data := DataSlice{Name: "shared-data", Records: [][]byte{[]byte("sample"), []byte("slice")}}

	submissions := []Submission{
		{PartyID: "party-a", Model: model, Data: data},
		{PartyID: "party-b", Model: model, Data: data},
	}

	results, err := runner.Run(context.Background(), submissions)
	if err != nil {
		t.Fatalf("runner execution failed: %v", err)
	}

	scoreA := results["party-a"].TaskScores["hash"]
	scoreB := results["party-b"].TaskScores["hash"]
	if scoreA.Value != scoreB.Value {
		t.Fatalf("expected identical score values, got %v and %v", scoreA.Value, scoreB.Value)
	}
	if scoreA.Evidence != scoreB.Evidence {
		t.Fatalf("expected identical evidence, got %s and %s", scoreA.Evidence, scoreB.Evidence)
	}
}

func TestScorecardsVerifyAndAreClean(t *testing.T) {
	policy := NewStaticPolicyFirewall(map[string][]Capability{
		"party-a": {Capability("compute")},
		"party-b": {Capability("compute")},
	})
	signer := fixedSigner(t)
	runner, err := NewRunner([]EvalTask{hashTask{}}, policy, signer, WithClock(func() time.Time {
		return time.Unix(200, 0)
	}))
	if err != nil {
		t.Fatalf("failed to create runner: %v", err)
	}

	modelA := ModelArtifact{Name: "shared", Capabilities: []Capability{"compute"}, Payload: []byte("MODEL-A")}
	modelB := ModelArtifact{Name: "shared", Capabilities: []Capability{"compute"}, Payload: []byte("MODEL-B")}
	dataA := DataSlice{Name: "shared-data", Records: [][]byte{[]byte("alpha")}}
	dataB := DataSlice{Name: "shared-data", Records: [][]byte{[]byte("beta")}}

	submissions := []Submission{
		{PartyID: "party-a", Model: modelA, Data: dataA},
		{PartyID: "party-b", Model: modelB, Data: dataB},
	}

	results, err := runner.Run(context.Background(), submissions)
	if err != nil {
		t.Fatalf("runner execution failed: %v", err)
	}

	for party, scorecard := range results {
		verified, err := signer.VerifyScorecard(scorecard)
		if err != nil {
			t.Fatalf("verification errored for %s: %v", party, err)
		}
		if !verified {
			t.Fatalf("scorecard signature failed for %s", party)
		}
		if got := scorecard.Metadata["party"]; got != party {
			t.Fatalf("metadata party mismatch for %s: %s", party, got)
		}
		if _, ok := scorecard.Metadata["sandbox_id"]; !ok {
			t.Fatalf("sandbox id missing for %s", party)
		}
		if len(scorecard.Metadata) != 2 {
			t.Fatalf("expected only sandbox metadata for %s, got %#v", party, scorecard.Metadata)
		}
	}
}
