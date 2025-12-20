package diff_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/summit/jpr"
	jprdiff "github.com/summit/jpr/diff"
)

func TestDiffMatchesGolden(t *testing.T) {
	engine := compileEngine(t)
	before := time.Date(2024, 5, 30, 0, 0, 0, 0, time.UTC)
	after := time.Date(2024, 6, 2, 0, 0, 0, 0, time.UTC)

	diffs, err := jprdiff.Compute(engine, before, after)
	if err != nil {
		t.Fatalf("compute diff: %v", err)
	}

	blob, err := jprdiff.ToJSON(diffs)
	if err != nil {
		t.Fatalf("marshal diff: %v", err)
	}

	goldenPath := filepath.Join("testdata", "diff_golden.json")
	golden, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden: %v", err)
	}

	if strings.TrimSpace(string(blob)) != strings.TrimSpace(string(golden)) {
		t.Fatalf("diff mismatch\nexpected:\n%s\nactual:\n%s", golden, blob)
	}
}

func compileEngine(t *testing.T) *jpr.Engine {
	t.Helper()
	f, err := os.Open(filepath.Join("..", "testdata", "policies.yaml"))
	if err != nil {
		t.Fatalf("open policies: %v", err)
	}
	defer f.Close()

	doc, err := jpr.Parse(f)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}

	engine, err := jpr.Compile(doc, time.Minute)
	if err != nil {
		t.Fatalf("compile: %v", err)
	}
	return engine
}
