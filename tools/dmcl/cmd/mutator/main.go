package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	"github.com/summit/dmcl/mutations"
)

func main() {
	var inputPath string
	var outputPath string
	var mutation string
	var seed int64

	flag.StringVar(&inputPath, "input", "", "path to input JSON dataset")
	flag.StringVar(&outputPath, "output", "", "path to write mutated dataset")
	flag.StringVar(&mutation, "mutation", "", "mutation type")
	flag.Int64Var(&seed, "seed", 0, "seed for deterministic mutations")
	flag.Parse()

	if inputPath == "" || outputPath == "" || mutation == "" {
		log.Fatalf("input, output, and mutation flags are required")
	}

	payload, err := ioutil.ReadFile(inputPath)
	if err != nil {
		log.Fatalf("read input: %v", err)
	}

	mutated, err := mutations.Mutate(payload, mutations.MutationType(mutation), seed)
	if err != nil {
		log.Fatalf("mutate: %v", err)
	}

	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		log.Fatalf("create output directory: %v", err)
	}

	if err := ioutil.WriteFile(outputPath, mutated, 0o644); err != nil {
		log.Fatalf("write output: %v", err)
	}

	fmt.Printf("mutation=%s seed=%d records_written=%d\n", mutation, seed, countRecords(mutated))
}

func countRecords(payload []byte) int {
	var records []interface{}
	if err := json.Unmarshal(payload, &records); err != nil {
		return 0
	}
	return len(records)
}
