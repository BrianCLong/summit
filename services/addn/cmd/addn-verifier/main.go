package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/summit/addn/pkg/addn"
)

func main() {
	manifestPath := flag.String("manifest", "", "path to manifest response json")
	artifactDir := flag.String("artifacts", "", "directory containing artifacts to verify")
	region := flag.String("region", "", "region to enforce residency pins")
	flag.Parse()

	if *manifestPath == "" {
		log.Fatal("--manifest is required")
	}

	data, err := os.ReadFile(*manifestPath)
	if err != nil {
		log.Fatalf("read manifest: %v", err)
	}

	var resp addn.ManifestResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		log.Fatalf("decode manifest: %v", err)
	}

	if err := addn.VerifyManifest(resp, time.Now().UTC(), *region); err != nil {
		log.Fatalf("manifest verification failed: %v", err)
	}

	if *artifactDir != "" {
		if err := verifyArtifacts(resp, *artifactDir); err != nil {
			log.Fatalf("artifact verification failed: %v", err)
		}
	}

	fmt.Println("ADDN verification successful")
}

func verifyArtifacts(resp addn.ManifestResponse, dir string) error {
	for _, art := range resp.Manifest.Artifacts {
		path := filepath.Join(dir, art.Name)
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read artifact %s: %w", art.Name, err)
		}
		digest := sha256.Sum256(data)
		if hex.EncodeToString(digest[:]) != art.Digest {
			return fmt.Errorf("digest mismatch for %s", art.Name)
		}
	}
	return nil
}
