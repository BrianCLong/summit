# C7 — Resource Leak Detector

C7 is a lightweight Go library and tool designed to detect resource leaks in running Go applications. It monitors:

- **Goroutines**: Detects unexpected growth in goroutine count.
- **File Descriptors**: Monitors open file handles (Linux only).
- **Database Connections**: Tracks `database/sql` connection pool usage.

## Usage

### As a Library

Import `github.com/summit/c7/pkg/detector` in your Go application.

```go
import (
    "database/sql"
    "time"
    "github.com/summit/c7/pkg/detector"
)

func main() {
    db, _ := sql.Open("postgres", "...")

    // Configure thresholds
    cfg := detector.Config{
        MaxGoroutines:        1000,
        MaxFileDescriptors:   500,
        MaxDBOpenConnections: 50,
    }

    // Initialize detector
    det := detector.NewDetector(cfg, db)

    // Start background monitoring
    stop := make(chan struct{})
    go det.Monitor(10*time.Second, stop, func(report *detector.Report) {
        if len(report.LeaksDetected) > 0 {
            // Log alert or send to metric system
            log.Printf("Resource leaks detected: %v", report.LeaksDetected)
        }
    })

    // ... application logic ...
}
```

### Running the Demo

To run the built-in demo which simulates leaks:

```bash
cd tools/c7
go run cmd/c7/main.go
```

## Features

- **Goroutine Leak Detection**: Uses `runtime.NumGoroutine()` to check against a configured threshold.
- **File Descriptor Monitoring**: Reads `/proc/self/fd` to count open file descriptors (Linux/Unix).
- **SQL Connection Tracking**: Inspects `*sql.DB` statistics to detect connection pool exhaustion.
