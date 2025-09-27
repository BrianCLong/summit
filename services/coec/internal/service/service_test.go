package service_test

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	"github.com/summit-hq/coec/internal/aggregation"
	"github.com/summit-hq/coec/internal/models"
	"github.com/summit-hq/coec/internal/service"
)

func TestDeterministicCohortsAndAggregation(t *testing.T) {
	manager := service.NewManager()
	secret := make([]byte, 32)
	for i := range secret {
		secret[i] = byte(i + 1)
	}
	cfg := models.ExperimentConfig{
		ID:          "exp-001",
		Description: "cross-org test",
		VRFKey:      base64.StdEncoding.EncodeToString(secret),
		Cohorts: []models.Cohort{
			{Name: "control", Fraction: 0.5},
			{Name: "treatment", Fraction: 0.5},
		},
		Metrics: []aggregation.MetricDefinition{
			{Name: "ctr", Aggregation: "mean", Sensitivity: 1.0},
		},
		Organisations: []models.OrgRegistration{{OrgID: "orgA"}, {OrgID: "orgB"}},
	}
	_, returnedSecret, publicKeys, err := manager.CreateExperiment(cfg)
	if err != nil {
		t.Fatalf("create experiment: %v", err)
	}
	if returnedSecret != base64.StdEncoding.EncodeToString(secret) {
		t.Fatalf("unexpected vrf secret: %s", returnedSecret)
	}
	if len(publicKeys) != 2 {
		t.Fatalf("expected 2 public keys, got %d", len(publicKeys))
	}

	assignment1, err := manager.AssignCohort("exp-001", "subject-007", map[string]interface{}{"country": "us"})
	if err != nil {
		t.Fatalf("assign cohort failed: %v", err)
	}
	assignment2, err := manager.AssignCohort("exp-001", "subject-007", map[string]interface{}{"country": "us"})
	if err != nil {
		t.Fatalf("assign cohort failed: %v", err)
	}
	if assignment1.Cohort != assignment2.Cohort {
		t.Fatalf("cohorts diverged: %s vs %s", assignment1.Cohort, assignment2.Cohort)
	}
	if assignment1.VRF.Proof != assignment2.VRF.Proof {
		t.Fatal("vrf proofs mismatch on replay")
	}

	baseline := map[string]map[string]float64{
		"orgA": {"ctr": 0.62},
		"orgB": {"ctr": 0.55},
	}

	contributions := []aggregation.Contribution{
		{
			OrgID:  "orgA",
			Cohort: assignment1.Cohort,
			Share:  aggregation.ContributionShare{Mask: 0, Metrics: map[string]float64{"ctr": 0.62}, Count: 1000},
		},
		{
			OrgID:  "orgB",
			Cohort: assignment1.Cohort,
			Share:  aggregation.ContributionShare{Mask: 0, Metrics: map[string]float64{"ctr": 0.55}, Count: 950},
		},
	}
	for _, contrib := range contributions {
		if err := manager.SubmitContribution("exp-001", contrib); err != nil {
			t.Fatalf("submit contribution: %v", err)
		}
	}

	briefs, err := manager.FinaliseExperiment("exp-001")
	if err != nil {
		t.Fatalf("finalise failed: %v", err)
	}
	if len(briefs) != 2 {
		t.Fatalf("expected briefs for 2 orgs, got %d", len(briefs))
	}

	for _, brief := range briefs {
		cohort, ok := brief.Results.Cohorts[assignment1.Cohort]
		if !ok {
			continue
		}
		metric := cohort.Metrics["ctr"]
		expected := baseline[brief.OrgID]["ctr"]
		if diff := metric.Value - expected; diff > 1e-9 || diff < -1e-9 {
			toJSON, _ := json.Marshal(metric)
			t.Fatalf("metric mismatch for %s: got %s expected %.2f", brief.OrgID, toJSON, expected)
		}

		payload := struct {
			ExperimentID string                `json:"experimentId"`
			Result       aggregation.OrgResult `json:"result"`
			IssuedAt     time.Time             `json:"issuedAt"`
		}{
			ExperimentID: brief.ExperimentID,
			Result:       brief.Results,
			IssuedAt:     brief.SignedAt,
		}
		bytes, _ := json.Marshal(payload)
		sig, err := base64.StdEncoding.DecodeString(brief.Signature)
		if err != nil {
			t.Fatalf("signature decode failed: %v", err)
		}
		if !ed25519.Verify(brief.PublicKey, bytes, sig) {
			t.Fatalf("signature verification failed for %s", brief.OrgID)
		}
	}

	again, err := manager.FinaliseExperiment("exp-001")
	if err != nil {
		t.Fatalf("re-finalise failed: %v", err)
	}
	if len(again) != len(briefs) {
		t.Fatalf("expected %d briefs on second finalise, got %d", len(briefs), len(again))
	}
	for i := range briefs {
		if briefs[i].Signature != again[i].Signature {
			t.Fatalf("non-deterministic signature for %s", briefs[i].OrgID)
		}
	}
}

func TestDifferentialPrivacyDeterminism(t *testing.T) {
	manager := service.NewManager()
	secret := make([]byte, 32)
	for i := range secret {
		secret[i] = 42
	}
	cfg := models.ExperimentConfig{
		ID:     "exp-dp",
		VRFKey: base64.StdEncoding.EncodeToString(secret),
		Cohorts: []models.Cohort{
			{Name: "cohort", Fraction: 1.0},
		},
		Metrics: []aggregation.MetricDefinition{
			{Name: "lift", Aggregation: "sum", Sensitivity: 1.0},
		},
		DPConfig:      &aggregation.DPConfig{Epsilon: 0.5, Delta: 1e-6, Sensitivity: 1.0},
		Organisations: []models.OrgRegistration{{OrgID: "orgA"}},
	}
	if _, _, _, err := manager.CreateExperiment(cfg); err != nil {
		t.Fatalf("create experiment: %v", err)
	}
	contribution := aggregation.Contribution{
		OrgID:  "orgA",
		Cohort: "cohort",
		Share:  aggregation.ContributionShare{Mask: 0.25, Metrics: map[string]float64{"lift": 10.25}, Count: 500},
	}
	if err := manager.SubmitContribution("exp-dp", contribution); err != nil {
		t.Fatalf("submit contribution: %v", err)
	}
	first, err := manager.FinaliseExperiment("exp-dp")
	if err != nil {
		t.Fatalf("finalise: %v", err)
	}
	second, err := manager.FinaliseExperiment("exp-dp")
	if err != nil {
		t.Fatalf("re-finalise: %v", err)
	}
	if len(first) != 1 || len(second) != 1 {
		t.Fatalf("expected single brief")
	}
	value1 := first[0].Results.Cohorts["cohort"].Metrics["lift"].Value
	value2 := second[0].Results.Cohorts["cohort"].Metrics["lift"].Value
	if value1 != value2 {
		t.Fatalf("dp noise should be deterministic, got %f vs %f", value1, value2)
	}
}
