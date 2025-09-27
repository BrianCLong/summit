package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBudgetCheckEnforcesLimit(t *testing.T) {
	model := NewDefaultModel()
	store := NewJobStore()
	router := Router(model, store)

	payload := map[string]any{
		"jobId":  "budget-1",
		"region": "us-east-1",
		"resources": map[string]any{
			"cpuSeconds": 1800,
			"ramGbHours": 8,
			"ioGb":       10,
			"egressGb":   5,
		},
		"budgetUsd": 0.5,
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/v1/budget/check", bytes.NewReader(body))
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden when over budget, got %d", rec.Code)
	}

	var resp budgetCheckResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Allowed {
		t.Fatalf("expected allowed=false when over budget")
	}
	if resp.ProjectedUSD <= resp.BudgetUSD {
		t.Fatalf("projected cost should exceed budget")
	}
}

func TestActualReconcilesProjection(t *testing.T) {
	model := NewDefaultModel()
	store := NewJobStore()
	router := Router(model, store)

	estimatePayload := map[string]any{
		"jobId":  "job-123",
		"region": "eu-west-1",
		"resources": map[string]any{
			"cpuSeconds": 4000,
			"ramGbHours": 24,
			"ioGb":       40,
			"egressGb":   18,
		},
	}
	body, _ := json.Marshal(estimatePayload)
	req := httptest.NewRequest(http.MethodPost, "/v1/estimate", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("estimate failed with code %d: %s", rec.Code, rec.Body.String())
	}

	var projected JobRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &projected); err != nil {
		t.Fatalf("failed to decode projection: %v", err)
	}
	if projected.Projected.CostUSD == 0 {
		t.Fatalf("projection missing cost data")
	}

	actualPayload := map[string]any{
		"jobId":  "job-123",
		"region": "eu-west-1",
		"resources": map[string]any{
			"cpuSeconds": 4200,
			"ramGbHours": 24.5,
			"ioGb":       42,
			"egressGb":   18,
		},
	}
	actualBody, _ := json.Marshal(actualPayload)
	actualReq := httptest.NewRequest(http.MethodPost, "/v1/actual", bytes.NewReader(actualBody))
	actualRec := httptest.NewRecorder()
	router.ServeHTTP(actualRec, actualReq)

	if actualRec.Code != http.StatusOK {
		t.Fatalf("actual failed with code %d: %s", actualRec.Code, actualRec.Body.String())
	}

	var reconciled JobRecord
	if err := json.Unmarshal(actualRec.Body.Bytes(), &reconciled); err != nil {
		t.Fatalf("failed to decode reconciled record: %v", err)
	}

	if reconciled.Actual == nil {
		t.Fatalf("expected actual results to be present")
	}

	if reconciled.Actual.Delta.CostUSD == 0 {
		t.Fatalf("expected non-zero delta for cost")
	}
}
