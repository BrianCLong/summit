package main

import (
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/summit/jpr"
	jprdiff "github.com/summit/jpr/diff"
)

func main() {
	var policyPath string
	var before string
	var after string

	flag.StringVar(&policyPath, "policies", "", "Path to the policy YAML document")
	flag.StringVar(&before, "before", "", "Decision date before (YYYY-MM-DD)")
	flag.StringVar(&after, "after", "", "Decision date after (YYYY-MM-DD)")
	flag.Parse()

	if policyPath == "" || before == "" || after == "" {
		fmt.Fprintln(os.Stderr, "policies, before and after are required")
		os.Exit(1)
	}

	f, err := os.Open(policyPath)
	if err != nil {
		exitErr(err)
	}
	defer f.Close()

	doc, err := jpr.Parse(f)
	if err != nil {
		exitErr(err)
	}

	engine, err := jpr.Compile(doc, 5*time.Minute)
	if err != nil {
		exitErr(err)
	}

	beforeDate, err := time.Parse("2006-01-02", before)
	if err != nil {
		exitErr(err)
	}
	afterDate, err := time.Parse("2006-01-02", after)
	if err != nil {
		exitErr(err)
	}

	diffs, err := jprdiff.Compute(engine, beforeDate, afterDate)
	if err != nil {
		exitErr(err)
	}

	blob, err := jprdiff.ToJSON(diffs)
	if err != nil {
		exitErr(err)
	}

	fmt.Println(string(blob))
}

func exitErr(err error) {
	fmt.Fprintf(os.Stderr, "jprdiff error: %v\n", err)
	os.Exit(1)
}
