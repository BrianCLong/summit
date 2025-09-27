package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/summit/qpg/internal/config"
	"github.com/summit/qpg/internal/policy"
	"github.com/summit/qpg/internal/tokenvault"
)

func setupTestServer(t *testing.T) http.Handler {
	t.Helper()
	defs, err := config.LoadPolicies("../../config/policies.yaml")
	require.NoError(t, err)
	mgr := policy.NewManager(defs)
	gateCfg, err := config.LoadVault("../../config/vault.yaml")
	require.NoError(t, err)
	gate, err := tokenvault.NewRecoveryGate(*gateCfg)
	require.NoError(t, err)
	vault := tokenvault.NewTokenVault("unit-test-secret")
	srv := New(mgr, vault, gate)
	return srv.Handler()
}

func TestTokenizeTransformsAccordingToPolicy(t *testing.T) {
	handler := setupTestServer(t)
	reqBody := TokenizeRequest{
		Tenant:  "acme",
		Purpose: "analytics",
		Payload: map[string]any{
			"ssn":   "123456789",
			"email": "user@example.com",
			"name":  "Alice",
		},
	}
	resp := performTokenize(t, handler, reqBody)
	ssn := resp.Payload["ssn"].(string)
	email := resp.Payload["email"].(string)
	name := resp.Payload["name"].(string)

	require.NotEqual(t, "123456789", ssn)
	require.Equal(t, 9, len(ssn))
	require.NotEqual(t, "user@example.com", email)
	require.Equal(t, 64, len(email))
	require.Equal(t, "Alice", name)
}

func TestRevealRequiresQuorum(t *testing.T) {
	handler := setupTestServer(t)
	tokenResp := performTokenize(t, handler, TokenizeRequest{
		Tenant:  "acme",
		Purpose: "support",
		Payload: map[string]any{
			"ticketId":     "TCK-123",
			"internalNote": "Handle with care",
		},
	})

	token := tokenResp.Payload["ticketId"].(string)
	revealReq := RevealRequest{
		Tenant:  "acme",
		Purpose: "support",
		Field:   "ticketId",
		Token:   token,
		Shares:  []string{"alpha-key"},
	}
	body, _ := json.Marshal(revealReq)
	r := httptest.NewRequest(http.MethodPost, "/reveal", bytes.NewReader(body))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	require.Equal(t, http.StatusForbidden, w.Code)
}

func TestRevealSucceedsWithQuorum(t *testing.T) {
	handler := setupTestServer(t)
	tokenResp := performTokenize(t, handler, TokenizeRequest{
		Tenant:  "acme",
		Purpose: "support",
		Payload: map[string]any{
			"ticketId": "TCK-123",
		},
	})

	token := tokenResp.Payload["ticketId"].(string)
	revealReq := RevealRequest{
		Tenant:  "acme",
		Purpose: "support",
		Field:   "ticketId",
		Token:   token,
		Shares:  []string{"alpha-key", "beta-key"},
	}
	body, _ := json.Marshal(revealReq)
	r := httptest.NewRequest(http.MethodPost, "/reveal", bytes.NewReader(body))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	require.Equal(t, http.StatusOK, w.Code)

	var resp RevealResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	require.Equal(t, "TCK-123", resp.Value)
}

func performTokenize(t *testing.T, handler http.Handler, req TokenizeRequest) TokenizeResponse {
	t.Helper()
	body, err := json.Marshal(req)
	require.NoError(t, err)
	r := httptest.NewRequest(http.MethodPost, "/tokenize", bytes.NewReader(body))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	require.Equal(t, http.StatusOK, w.Code)
	var resp TokenizeResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	return resp
}
