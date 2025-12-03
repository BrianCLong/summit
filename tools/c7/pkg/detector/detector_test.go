package detector

import (
	"runtime"
	"testing"
	"time"
)

func TestCheck(t *testing.T) {
	cfg := Config{
		MaxGoroutines:      10000,
		MaxFileDescriptors: 10000,
	}
	det := NewDetector(cfg, nil)

	report, err := det.Check()
	if err != nil {
		t.Fatalf("Check failed: %v", err)
	}

	if report.Goroutines <= 0 {
		t.Errorf("Expected > 0 goroutines, got %d", report.Goroutines)
	}
	// FDs might be 0 on non-linux or if no files open (unlikely for a test runner)
	if runtime.GOOS == "linux" && report.FileDescriptors <= 0 {
		t.Errorf("Expected > 0 FDs on Linux, got %d", report.FileDescriptors)
	}
}

func TestLeaksDetected(t *testing.T) {
	// Set threshold lower than current usage
	currentGoroutines := runtime.NumGoroutine()
	// Ensure max is at least 0, but since we want to trigger, setting to current-1 is good,
	// unless current is 1 (unlikely in test runner), then set to 0.
	maxG := currentGoroutines - 1
	if maxG < 0 {
		maxG = 0
	}

	cfg := Config{
		MaxGoroutines:      maxG,
		MaxFileDescriptors: 10000,
	}

	det := NewDetector(cfg, nil)
	report, err := det.Check()
	if err != nil {
		t.Fatalf("Check failed: %v", err)
	}

	foundLeak := false
	for _, leak := range report.LeaksDetected {
		if len(leak) > 0 { // Just check if any leak string is present
			foundLeak = true
			break
		}
	}

	if !foundLeak {
		t.Errorf("Expected leak detection for goroutines (current %d > max %d), got report: %+v",
			currentGoroutines, cfg.MaxGoroutines, report)
	}
}

func TestMonitor(t *testing.T) {
	cfg := Config{MaxGoroutines: 10000}
	det := NewDetector(cfg, nil)

	stop := make(chan struct{})
	reports := make(chan *Report)

	go det.Monitor(10*time.Millisecond, stop, func(r *Report) {
		reports <- r
	})

	select {
	case r := <-reports:
		if r == nil {
			t.Error("Received nil report")
		}
	case <-time.After(1 * time.Second):
		t.Error("Timeout waiting for monitor report")
	}

	close(stop)
}
