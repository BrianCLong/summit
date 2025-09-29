package main

import (
  "context"
  "testing"
  "time"
)

func TestRunCompletes(t *testing.T) {
  ctx, cancel := context.WithTimeout(context.Background(), time.Second)
  defer cancel()

  if err := run(ctx); err != nil {
    t.Fatalf("expected nil error, got %v", err)
  }
}

func TestGetEnvFallback(t *testing.T) {
  if got := getEnv("NOT_SET", "fallback"); got != "fallback" {
    t.Fatalf("expected fallback, got %s", got)
  }
}
