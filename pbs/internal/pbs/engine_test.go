package pbs_test

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/summit/pbs/internal/pbs"
)

func fixturePath(t *testing.T, name string) string {
	t.Helper()
	return filepath.Join("..", "..", "testdata", name)
}

func mustLoadHistory(t *testing.T) ([]pbs.HistoricalDecision, string) {
	t.Helper()
	history, digest, err := pbs.LoadHistory(fixturePath(t, "history_sample.json"))
	if err != nil {
		t.Fatalf("load history: %v", err)
	}
	return history, digest
}

func mustLoadPolicy(t *testing.T, name string) pbs.PolicySnapshot {
	t.Helper()
	policy, err := pbs.LoadPolicy(fixturePath(t, name))
	if err != nil {
		t.Fatalf("load policy %s: %v", name, err)
	}
	return policy
}

func TestDeterministicReplay(t *testing.T) {
	history, digest := mustLoadHistory(t)
	policy := mustLoadPolicy(t, "policy_hardened.json")

	engine, err := pbs.NewEngine(policy)
	if err != nil {
		t.Fatalf("new engine: %v", err)
	}

	summary1, impacts1, evals1 := engine.Run(history)
	summary2, impacts2, evals2 := engine.Run(history)

	if !reflect.DeepEqual(summary1, summary2) {
		t.Fatalf("summary mismatch: %#v vs %#v", summary1, summary2)
	}
	if !reflect.DeepEqual(impacts1, impacts2) {
		t.Fatalf("impacts mismatch: %#v vs %#v", impacts1, impacts2)
	}
	if !reflect.DeepEqual(evals1, evals2) {
		t.Fatalf("evaluations mismatch")
	}

	report := pbs.BuildReport(summary1, impacts1, policy, digest)
	if report.DeterministicRunID == "" {
		t.Fatalf("run id should not be empty")
	}
}

func TestPolicyChangeDelta(t *testing.T) {
	history, digest := mustLoadHistory(t)

	baseline := mustLoadPolicy(t, "policy_baseline.json")
	hardened := mustLoadPolicy(t, "policy_hardened.json")

	engineBaseline, err := pbs.NewEngine(baseline)
	if err != nil {
		t.Fatalf("baseline engine: %v", err)
	}
	baseSummary, _, _ := engineBaseline.Run(history)
	if baseSummary.BlockRateDelta != 0 {
		t.Fatalf("expected baseline block delta 0, got %v", baseSummary.BlockRateDelta)
	}
	if baseSummary.FalseNegativeCanaryCatchers != 0 {
		t.Fatalf("expected no canary catches in baseline")
	}

	engineHardened, err := pbs.NewEngine(hardened)
	if err != nil {
		t.Fatalf("hardened engine: %v", err)
	}
	hardenedSummary, _, _ := engineHardened.Run(history)

	if hardenedSummary.BlockRateDelta <= baseSummary.BlockRateDelta {
		t.Fatalf("expected hardened block delta > baseline, got %v", hardenedSummary.BlockRateDelta)
	}
	if hardenedSummary.FalseNegativeCanaryCatchers != 1 {
		t.Fatalf("expected hardened to catch 1 canary, got %d", hardenedSummary.FalseNegativeCanaryCatchers)
	}

	report := pbs.BuildReport(hardenedSummary, nil, hardened, digest)
	rec := pbs.BuildRecommendation(report)

	goldenPath := fixturePath(t, "recommendation_hardened.golden.txt")
	golden, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden: %v", err)
	}
	if rec != string(golden) {
		t.Fatalf("recommendation mismatch.\nwant:\n%s\n----\ngot:\n%s", string(golden), rec)
	}
}

func TestReportSigning(t *testing.T) {
	history, digest := mustLoadHistory(t)
	policy := mustLoadPolicy(t, "policy_hardened.json")

	engine, err := pbs.NewEngine(policy)
	if err != nil {
		t.Fatalf("engine: %v", err)
	}
	summary, impacts, _ := engine.Run(history)
	report := pbs.BuildReport(summary, impacts, policy, digest)

	key, err := pbs.LoadSigningKey(fixturePath(t, "signing_key.json"))
	if err != nil {
		t.Fatalf("load signing key: %v", err)
	}
	signed, err := pbs.SignReport(report, key)
	if err != nil {
		t.Fatalf("sign report: %v", err)
	}
	if len(signed.Signatures) != 1 {
		t.Fatalf("expected 1 signature, got %d", len(signed.Signatures))
	}
	sig := signed.Signatures[0]
	if sig.Digest == "" || sig.Signature == "" || sig.KeyID == "" {
		t.Fatalf("signature missing fields: %#v", sig)
	}
}
