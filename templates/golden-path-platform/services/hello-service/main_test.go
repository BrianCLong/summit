package main

import (
  "net/http"
  "net/http/httptest"
  "testing"
)

func TestHelloEndpoint(t *testing.T) {
  res := httptest.NewRecorder()

  respondJSON(res, http.StatusOK, map[string]string{"message": "hello"})

  if res.Code != http.StatusOK {
    t.Fatalf("expected 200, got %d", res.Code)
  }

  if want := "{\"data\":{\"message\":\"hello\"}}"; res.Body.String() != want {
    t.Fatalf("unexpected body: %s", res.Body.String())
  }
}

func TestGetEnv(t *testing.T) {
  if got := getEnv("UNSET_ENV", "fallback"); got != "fallback" {
    t.Fatalf("expected fallback, got %s", got)
  }
}
