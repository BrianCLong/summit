package frameworkrisk

import (
    "os"
    "path/filepath"
    "testing"
)

func TestDetectNextJS(t *testing.T) {
    // Create temp directory for mock package.json
    dir, err := os.MkdirTemp("", "test-detect-nextjs")
    if err != nil {
        t.Fatal(err)
    }
    defer os.RemoveAll(dir) // clean up

    // Test Case 1: No package.json
    detected, err := DetectNextJS(dir)
    if err != nil {
        t.Errorf("Unexpected error: %v", err)
    }
    if detected != false {
        t.Errorf("Expected Next.js detection to be false, got true")
    }

    // Test Case 2: package.json with no next dep
    pkgPath := filepath.Join(dir, "package.json")
    pkgData := []byte(`{"dependencies": {"react": "^18.0.0"}}`)
    if err := os.WriteFile(pkgPath, pkgData, 0644); err != nil {
        t.Fatal(err)
    }

    detected, err = DetectNextJS(dir)
    if err != nil {
        t.Errorf("Unexpected error: %v", err)
    }
    if detected != false {
        t.Errorf("Expected Next.js detection to be false, got true")
    }

    // Test Case 3: package.json with next dep
    pkgData = []byte(`{"dependencies": {"next": "^14.0.0"}}`)
    if err := os.WriteFile(pkgPath, pkgData, 0644); err != nil {
        t.Fatal(err)
    }

    detected, err = DetectNextJS(dir)
    if err != nil {
        t.Errorf("Unexpected error: %v", err)
    }
    if detected != true {
        t.Errorf("Expected Next.js detection to be true, got false")
    }

    // Test Case 4: package.json with next devDep
    pkgData = []byte(`{"devDependencies": {"next": "^14.0.0"}}`)
    if err := os.WriteFile(pkgPath, pkgData, 0644); err != nil {
        t.Fatal(err)
    }

    detected, err = DetectNextJS(dir)
    if err != nil {
        t.Errorf("Unexpected error: %v", err)
    }
    if detected != true {
        t.Errorf("Expected Next.js detection to be true, got false")
    }
}
