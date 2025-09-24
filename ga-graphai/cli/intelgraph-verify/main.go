package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

func exitCodeForStatus(status string) int {
	switch status {
	case "pass":
		return 0
	case "unverifiable":
		return 2
	case "tampered":
		return 3
	case "schema-mismatch":
		return 4
	default:
		return 1
	}
}

func main() {
	machine := flag.Bool("machine", false, "emit JSON result")
	flag.Parse()

	if flag.NArg() != 1 {
		fmt.Fprintln(os.Stderr, "usage: intelgraph-verify [--machine] <bundle-path>")
		os.Exit(1)
	}

	bundlePath := flag.Arg(0)
	manifestPath := filepath.Join(bundlePath, "manifest.json")

	manifest, err := loadManifest(manifestPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load manifest: %v\n", err)
		os.Exit(1)
	}

	result := verifyBundle(bundlePath, manifest)

	if *machine {
		payload, _ := json.Marshal(result)
		fmt.Println(string(payload))
	} else {
		fmt.Printf("verification status: %s\n", result.Status)
		for _, issue := range result.Issues {
			fmt.Printf("- %s\n", issue)
		}
	}

	os.Exit(exitCodeForStatus(result.Status))
}
