package main

import (
  "encoding/json"
  "fmt"
  "log"
  "net/http"
  "os"
  "time"

  "github.com/go-chi/chi/v5"
  "github.com/go-chi/chi/v5/middleware"
)

var (
  version   = "dev"
  buildDate = ""
)

func main() {
  addr := getEnv("PORT", "8080")

  r := chi.NewRouter()
  r.Use(middleware.RealIP)
  r.Use(middleware.Logger)
  r.Use(middleware.Recoverer)
  r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
    respondJSON(w, http.StatusOK, map[string]string{
      "status":  "ok",
      "version": version,
    })
  })
  r.Get("/hello", func(w http.ResponseWriter, r *http.Request) {
    name := r.URL.Query().Get("name")
    if name == "" {
      name = "world"
    }
    respondJSON(w, http.StatusOK, map[string]string{
      "message": fmt.Sprintf("hello, %s", name),
      "version": version,
      "buildDate": buildDate,
    })
  })

  srv := &http.Server{
    Addr:              ":" + addr,
    Handler:           r,
    ReadHeaderTimeout: 5 * time.Second,
  }

  log.Printf("hello-service listening on %s", addr)
  if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
    log.Fatalf("server error: %v", err)
  }
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(status)
  _, _ = fmt.Fprintf(w, "{\"data\":%s}", toJSON(payload))
}

func toJSON(v any) string {
  b, err := json.Marshal(v)
  if err != nil {
    log.Printf("failed to marshal JSON: %v", err)
    return "{}"
  }
  return string(b)
}

func getEnv(key, fallback string) string {
  if value, ok := os.LookupEnv(key); ok {
    return value
  }
  return fallback
}
