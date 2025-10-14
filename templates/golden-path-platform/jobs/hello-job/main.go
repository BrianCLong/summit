package main

import (
  "context"
  "log"
  "os"
  "time"

  "github.com/robfig/cron/v3"
)

var (
  version   = "dev"
  buildDate = ""
)

func main() {
  schedule := getEnv("SCHEDULE", "@every 1m")
  cronLogger := log.New(os.Stdout, "hello-job ", log.LstdFlags)
  c := cron.New(cron.WithLogger(cron.PrintfLogger(cronLogger)))

  _, err := c.AddFunc(schedule, func() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := run(ctx); err != nil {
      cronLogger.Printf("job failed: %v", err)
    }
  })
  if err != nil {
    cronLogger.Fatalf("failed to schedule job: %v", err)
  }

  cronLogger.Printf("starting hello-job version=%s buildDate=%s schedule=%s", version, buildDate, schedule)
  c.Run()
}

func run(ctx context.Context) error {
  select {
  case <-ctx.Done():
    return ctx.Err()
  case <-time.After(250 * time.Millisecond):
    log.Printf("hello from job at %s", time.Now().UTC().Format(time.RFC3339))
    return nil
  }
}

func getEnv(key, fallback string) string {
  if value, ok := os.LookupEnv(key); ok {
    return value
  }
  return fallback
}
