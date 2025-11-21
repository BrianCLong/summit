package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/summit/escp/internal/proof"
)

type proofDocument struct {
	SubjectID string              `json:"subjectId"`
	Proofs    []proof.SystemProof `json:"proofs"`
}

func main() {
	file := flag.String("proof", "", "path to proof bundle JSON")
	subject := flag.String("subject", "", "expected subject identifier")
	flag.Parse()

	if *file == "" {
		log.Fatal("--proof is required")
	}

	raw, err := os.ReadFile(*file)
	if err != nil {
		log.Fatalf("read proof file: %v", err)
	}

	var doc proofDocument
	if err := json.Unmarshal(raw, &doc); err != nil {
		log.Fatalf("decode proof: %v", err)
	}

	if *subject != "" && doc.SubjectID != *subject {
		log.Fatalf("subject mismatch: expected %s got %s", *subject, doc.SubjectID)
	}

	for _, p := range doc.Proofs {
		if !p.Verify() {
			log.Fatalf("proof verification failed for system %s", p.System)
		}
		fmt.Printf("verified %s (%s)\n", p.System, p.Classification)
	}

	fmt.Println("all proofs verified")
}
