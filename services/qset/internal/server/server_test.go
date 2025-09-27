package server_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/summit/qset/internal/core"
	"github.com/summit/qset/internal/ledger"
	"github.com/summit/qset/internal/testutil"
)

type responseRequest struct {
	core.Request
}

type responseToken struct {
	core.Token
}

func TestQuorumRequiredForMint(t *testing.T) {
	harness := testutil.NewHarness(t)
	handler := harness.Server.Handler()

	reqBody := map[string]any{
		"requester": "dev1",
		"tool":      "github",
		"purpose":   "release",
		"scopes":    []string{"repo", "workflow"},
	}
	reqJSON, _ := json.Marshal(reqBody)
	rec := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(reqJSON))
	handler.ServeHTTP(rec, request)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d: %s", rec.Code, rec.Body.String())
	}
	var created responseRequest
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	// Attempt mint without quorum.
	mintReq := httptest.NewRequest(http.MethodPost, "/requests/"+created.ID+"/mint", nil)
	mintReq.Header.Set("X-Approver-Key", "alice-key")
	mintRec := httptest.NewRecorder()
	handler.ServeHTTP(mintRec, mintReq)
	if mintRec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d", mintRec.Code)
	}

	approve := func(key string) {
		req := httptest.NewRequest(http.MethodPost, "/requests/"+created.ID+"/approve", nil)
		req.Header.Set("X-Approver-Key", key)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("approve (%s) => %d: %s", key, rec.Code, rec.Body.String())
		}
	}

	approve("alice-key")
	approve("bob-key")

	mintReq2 := httptest.NewRequest(http.MethodPost, "/requests/"+created.ID+"/mint", nil)
	mintReq2.Header.Set("X-Approver-Key", "alice-key")
	mintRec2 := httptest.NewRecorder()
	handler.ServeHTTP(mintRec2, mintReq2)
	if mintRec2.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d: %s", mintRec2.Code, mintRec2.Body.String())
	}
	var token responseToken
	if err := json.Unmarshal(mintRec2.Body.Bytes(), &token); err != nil {
		t.Fatalf("token decode: %v", err)
	}
	if token.Secret == "" {
		t.Fatal("expected secret")
	}
}

func TestAttenuationConstraints(t *testing.T) {
	harness := testutil.NewHarness(t)
	handler := harness.Server.Handler()

	body := map[string]any{
		"requester": "dev2",
		"tool":      "github",
		"purpose":   "ci",
	}
	payload, _ := json.Marshal(body)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(payload))
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create => %d", rec.Code)
	}
	var created responseRequest
	_ = json.Unmarshal(rec.Body.Bytes(), &created)

	// Approve twice.
	for _, key := range []string{"alice-key", "bob-key"} {
		r := httptest.NewRequest(http.MethodPost, "/requests/"+created.ID+"/approve", nil)
		r.Header.Set("X-Approver-Key", key)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, r)
		if rr.Code != http.StatusOK {
			t.Fatalf("approve => %d", rr.Code)
		}
	}

	mint := httptest.NewRequest(http.MethodPost, "/requests/"+created.ID+"/mint", nil)
	mint.Header.Set("X-Approver-Key", "alice-key")
	mintRec := httptest.NewRecorder()
	handler.ServeHTTP(mintRec, mint)
	if mintRec.Code != http.StatusCreated {
		t.Fatalf("mint => %d: %s", mintRec.Code, mintRec.Body.String())
	}
	var token responseToken
	_ = json.Unmarshal(mintRec.Body.Bytes(), &token)

	// Try to extend scopes (should fail).
	badPayload := map[string]any{"scopes": []string{"repo", "workflow", "admin"}}
	badJSON, _ := json.Marshal(badPayload)
	badReq := httptest.NewRequest(http.MethodPost, "/tokens/"+token.ID+"/attenuate", bytes.NewReader(badJSON))
	badReq.Header.Set("X-Approver-Key", "alice-key")
	badRec := httptest.NewRecorder()
	handler.ServeHTTP(badRec, badReq)
	if badRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", badRec.Code)
	}

	// Try to extend expiry (should fail).
	extendPayload := map[string]any{"expiresAt": token.ExpiresAt.Add(1 * time.Hour).Format(time.RFC3339)}
	extendJSON, _ := json.Marshal(extendPayload)
	extendReq := httptest.NewRequest(http.MethodPost, "/tokens/"+token.ID+"/attenuate", bytes.NewReader(extendJSON))
	extendReq.Header.Set("X-Approver-Key", "alice-key")
	extendRec := httptest.NewRecorder()
	handler.ServeHTTP(extendRec, extendReq)
	if extendRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", extendRec.Code)
	}

	// Valid attenuation reduces scopes and expiry.
	okPayload := map[string]any{
		"scopes":    []string{"repo"},
		"expiresAt": token.ExpiresAt.Add(-1 * time.Hour).Format(time.RFC3339),
	}
	okJSON, _ := json.Marshal(okPayload)
	okReq := httptest.NewRequest(http.MethodPost, "/tokens/"+token.ID+"/attenuate", bytes.NewReader(okJSON))
	okReq.Header.Set("X-Approver-Key", "alice-key")
	okRec := httptest.NewRecorder()
	handler.ServeHTTP(okRec, okReq)
	if okRec.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d: %s", okRec.Code, okRec.Body.String())
	}
}

func TestDeterministicRequests(t *testing.T) {
	harness := testutil.NewHarness(t)
	handler := harness.Server.Handler()

	payload := map[string]any{
		"requester": "dev3",
		"tool":      "github",
		"purpose":   "release",
		"scopes":    []string{"repo"},
	}
	jsonBody, _ := json.Marshal(payload)

	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(jsonBody)))
	if rec1.Code != http.StatusCreated {
		t.Fatalf("create1 => %d", rec1.Code)
	}
	var first responseRequest
	_ = json.Unmarshal(rec1.Body.Bytes(), &first)

	// Approve once.
	apprReq := httptest.NewRequest(http.MethodPost, "/requests/"+first.ID+"/approve", nil)
	apprReq.Header.Set("X-Approver-Key", "alice-key")
	apprRec := httptest.NewRecorder()
	handler.ServeHTTP(apprRec, apprReq)
	if apprRec.Code != http.StatusOK {
		t.Fatalf("approve => %d", apprRec.Code)
	}

	// Duplicate request returns same ID and carries prior approval state.
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(jsonBody)))
	if rec2.Code != http.StatusOK {
		t.Fatalf("create2 => %d", rec2.Code)
	}
	var second responseRequest
	_ = json.Unmarshal(rec2.Body.Bytes(), &second)
	if second.ID != first.ID {
		t.Fatalf("expected same id got %s vs %s", second.ID, first.ID)
	}
	if len(second.Approvals) != 1 {
		t.Fatalf("expected one approval got %d", len(second.Approvals))
	}
	if second.Status != core.StatusPending {
		t.Fatalf("expected pending got %s", second.Status)
	}
}

func TestLedgerVerification(t *testing.T) {
	harness := testutil.NewHarness(t)
	handler := harness.Server.Handler()

	body := map[string]any{
		"requester": "ops",
		"tool":      "github",
		"purpose":   "release",
	}
	req := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(mustJSON(body)))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create => %d", rec.Code)
	}
	var created responseRequest
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	// Force some ledger activity.
	for _, key := range []string{"alice-key", "bob-key"} {
		approve := httptest.NewRequest(http.MethodPost, "/requests/"+created.ID+"/approve", nil)
		approve.Header.Set("X-Approver-Key", key)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, approve)
		if recorder.Code != http.StatusOK {
			t.Fatalf("approve => %d", recorder.Code)
		}
	}

	// Verify ledger.
	pubKey, err := ledger.DecodePublicKey(harness.PublicKey())
	if err != nil {
		t.Fatalf("decode public key: %v", err)
	}
	if err := ledger.VerifyFile(harness.Cfg.Ledger.Path, pubKey); err != nil {
		t.Fatalf("verification failed: %v", err)
	}
}

func mustJSON(v any) []byte {
	data, _ := json.Marshal(v)
	return data
}
