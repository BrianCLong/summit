package abac

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIsAllowed(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/authorize" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer token" {
			t.Fatalf("missing auth header")
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode error: %v", err)
		}
		if payload["action"] != "dataset:read" {
			t.Fatalf("unexpected action")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"allow":       true,
			"reason":      "allow",
			"obligations": []any{},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, WithToken("token"))
	decision, err := client.IsAllowed(context.Background(), DecisionRequest{SubjectID: "alice", Action: "dataset:read"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !decision.Allow {
		t.Fatalf("expected allow")
	}
}

func TestGetSubjectAttributes(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/subject/alice/attributes" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		if r.URL.Query().Get("refresh") != "true" {
			t.Fatalf("expected refresh flag")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data":   map[string]any{"tenantId": "tenantA"},
			"schema": map[string]string{"id": "identifier"},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL)
	attrs, err := client.GetSubjectAttributes(context.Background(), "alice", true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if attrs.Data["tenantId"].(string) != "tenantA" {
		t.Fatalf("unexpected tenant")
	}
}
