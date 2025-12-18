package detector

import (
	"database/sql"
	"fmt"
	"os"
	"runtime"
	"time"
)

// Config defines thresholds for resource usage.
type Config struct {
	MaxGoroutines        int
	MaxFileDescriptors   int
	MaxDBOpenConnections int
}

// Detector holds the configuration and references to monitored resources.
type Detector struct {
	config Config
	db     *sql.DB
}

// NewDetector creates a new Detector instance.
// db is optional (can be nil if not monitoring DB).
func NewDetector(config Config, db *sql.DB) *Detector {
	return &Detector{
		config: config,
		db:     db,
	}
}

// Report contains the current resource usage and any detected leaks.
type Report struct {
	Goroutines      int
	FileDescriptors int
	DBStats         sql.DBStats
	LeaksDetected   []string
	Timestamp       time.Time
}

// Check performs a one-time check of resource usage.
func (d *Detector) Check() (*Report, error) {
	report := &Report{
		Timestamp:     time.Now().UTC(),
		LeaksDetected: []string{},
	}

	// 1. Goroutines
	report.Goroutines = runtime.NumGoroutine()
	if d.config.MaxGoroutines > 0 && report.Goroutines > d.config.MaxGoroutines {
		report.LeaksDetected = append(report.LeaksDetected, fmt.Sprintf("Goroutines: %d > %d", report.Goroutines, d.config.MaxGoroutines))
	}

	// 2. File Descriptors (Linux specific)
	fds, err := countFDs()
	if err != nil {
		// Log error but don't fail the whole check?
		// For now return error to be strict.
		return nil, fmt.Errorf("failed to count FDs: %w", err)
	}
	report.FileDescriptors = fds
	if d.config.MaxFileDescriptors > 0 && report.FileDescriptors > d.config.MaxFileDescriptors {
		report.LeaksDetected = append(report.LeaksDetected, fmt.Sprintf("FileDescriptors: %d > %d", report.FileDescriptors, d.config.MaxFileDescriptors))
	}

	// 3. DB Connections
	if d.db != nil {
		stats := d.db.Stats()
		report.DBStats = stats

		// "Leak" in DB usually means connections not returned to pool (InUse high) or pool growing too large (OpenConnections high).
		// We use MaxDBOpenConnections as a proxy for pool exhaustion/leak.
		if d.config.MaxDBOpenConnections > 0 && stats.OpenConnections > d.config.MaxDBOpenConnections {
			report.LeaksDetected = append(report.LeaksDetected, fmt.Sprintf("DBOpenConnections: %d > %d", stats.OpenConnections, d.config.MaxDBOpenConnections))
		}
	}

	return report, nil
}

// countFDs counts the number of open file descriptors for the current process.
// It relies on /proc/self/fd which is available on Linux.
func countFDs() (int, error) {
	fdPath := "/proc/self/fd"
	// Check if directory exists (for non-Linux dev environments)
	if _, err := os.Stat(fdPath); os.IsNotExist(err) {
		// Fallback or just return 0 if not supported?
		// To avoid breaking on MacOS/Windows dev, we return 0.
		// But in prod (Linux container), this should work.
		if runtime.GOOS != "linux" {
			return 0, nil
		}
		return 0, err
	}

	entries, err := os.ReadDir(fdPath)
	if err != nil {
		return 0, err
	}
	return len(entries), nil
}

// Monitor runs the check periodically.
// It stops when the stop channel is closed.
func (d *Detector) Monitor(interval time.Duration, stop <-chan struct{}, callback func(*Report)) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			report, err := d.Check()
			if err != nil {
				// In a real monitoring tool, we might want to log this error via callback or logger.
				// For now, we skip.
				continue
			}
			callback(report)
		}
	}
}
