package main

import (
	"bufio"
	"context"
	"crypto/sha256"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/summit/alsp"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: runbook-prover <runbook.md> [output_dir]")
		os.Exit(1)
	}

	runbookPath := os.Args[1]
	outputDir := "provenance/wallet"
	if len(os.Args) > 2 {
		outputDir = os.Args[2]
	}

	file, err := os.Open(runbookPath)
	if err != nil {
		fmt.Printf("Error opening file: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()

	ctx := context.Background()

	// Use FileStorage for persistence (The Wallet)
	store, err := alsp.NewFileStorage(outputDir)
	if err != nil {
		fmt.Printf("Error creating file storage: %v\n", err)
		os.Exit(1)
	}

	// Block size 2 for demo purposes so we flush frequently
	prover, err := alsp.NewProver(ctx, store, 2)
	if err != nil {
		fmt.Printf("Error creating prover: %v\n", err)
		os.Exit(1)
	}

	scanner := bufio.NewScanner(file)
	fmt.Printf("Proving steps for runbook: %s\n", runbookPath)
	fmt.Printf("Exporting proofs to: %s\n", outputDir)
	fmt.Println("------------------------------------------------")

	stepCount := 0
	stepRegex := regexp.MustCompile(`^\d+\.`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		if len(line) > 0 && stepRegex.MatchString(line) {
			stepCount++
			fmt.Printf("Processing Step: %s\n", line)

			// Create a "proof" payload
			payload := fmt.Sprintf("Runbook: %s, Step: %s, ExecutedAt: %s", runbookPath, line, time.Now().Format(time.RFC3339))

			// Append to ALSP
			event, err := prover.AppendEvent(ctx, time.Now(), []byte(payload))
			if err != nil {
				fmt.Printf("Error appending event: %v\n", err)
				continue
			}

			fmt.Printf("  -> Proof Event Created: Index=%d, PayloadHash=%x\n", event.Index, sha256.Sum256(event.Payload))
		}
	}

	// Flush any remaining events
	if err := prover.Flush(ctx); err != nil {
		fmt.Printf("Error flushing prover: %v\n", err)
	}

	digest := prover.HeadDigest()
	fmt.Println("------------------------------------------------")
	fmt.Printf("Runbook Proven. Head Digest: %x\n", digest)
	fmt.Printf("Total Steps Proven: %d\n", stepCount)
}
