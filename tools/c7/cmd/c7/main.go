package main

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/summit/c7/pkg/detector"
)

func main() {
	fmt.Println("Starting C7 Resource Leak Detector Demo...")

	cfg := detector.Config{
		MaxGoroutines:      10,
		MaxFileDescriptors: 20,
		// MaxDBOpenConnections: 5, // No DB in this demo
	}

	det := detector.NewDetector(cfg, nil)

	stop := make(chan struct{})
	defer close(stop)

	// Start monitoring
	go det.Monitor(1*time.Second, stop, func(r *detector.Report) {
		if len(r.LeaksDetected) > 0 {
			fmt.Printf("[ALERT] Leaks detected: %v (Goroutines: %d, FDs: %d)\n",
				r.LeaksDetected, r.Goroutines, r.FileDescriptors)
		} else {
			fmt.Printf("[OK] Resources usage: Goroutines=%d, FDs=%d\n", r.Goroutines, r.FileDescriptors)
		}
	})

	// Simulate leaks
	var wg sync.WaitGroup
	files := []*os.File{}

	// 1. Leak goroutines
	fmt.Println("Simulating Goroutine leak...")
	for i := 0; i < 15; i++ {
		wg.Add(1)
		go func() {
			time.Sleep(10 * time.Second) // "Leak" for 10 seconds
			wg.Done()
		}()
	}

	time.Sleep(2 * time.Second)

	// 2. Leak file descriptors
	fmt.Println("Simulating FD leak...")
	for i := 0; i < 25; i++ {
		f, err := os.Open("/dev/null") // Open file
		if err == nil {
			files = append(files, f)
		}
	}

	time.Sleep(2 * time.Second)

	// Cleanup
	fmt.Println("Cleaning up...")
	for _, f := range files {
		f.Close()
	}
	wg.Wait()

	fmt.Println("Demo complete.")
}
