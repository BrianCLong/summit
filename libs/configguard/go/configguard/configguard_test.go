package configguard_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/intelgraph/summit/libs/configguard/go/configguard"
)

func fixture(name string) string {
	return filepath.Join("..", "testdata", name)
}

func TestLoad_InvalidConfig(t *testing.T) {
	schema := fixture("service.schema.json")
	config := fixture("invalid.yaml")

	result, err := configguard.Load(config, schema, &configguard.LoadOptions{})
	if err != nil {
		t.Fatalf("load returned error: %v", err)
	}

	if len(result.Diagnostics) == 0 {
		t.Fatalf("expected diagnostics for invalid config")
	}

	foundEnum := false
	for _, diag := range result.Diagnostics {
		if strings.Contains(strings.ToLower(diag.Message), "must be one of") {
			foundEnum = true
			break
		}
	}
	if !foundEnum {
		t.Fatalf("expected enum diagnostic in %v", result.Diagnostics)
	}
}

func TestLoad_InterpolationPolicy(t *testing.T) {
	schema := fixture("service.schema.json")
	config := fixture("interpolation.yaml")

	os.Unsetenv("SERVICE_NAME")
	os.Setenv("DATABASE_URL", "postgres://cached")
	t.Cleanup(func() {
		os.Unsetenv("DATABASE_URL")
	})

	opts := &configguard.LoadOptions{
		Interpolation: configguard.InterpolationPolicy{
			AllowList:        []string{"SERVICE_NAME", "DATABASE_URL"},
			Defaults:         map[string]string{"SERVICE_NAME": "intelgraph-dev"},
			OnMissing:        configguard.MissingWarn,
			RequireAllowList: true,
		},
	}

	result, err := configguard.Load(config, schema, opts)
	if err != nil {
		t.Fatalf("load returned error: %v", err)
	}

	cfg := result.Config.(map[string]any)
	if cfg["serviceName"].(string) != "intelgraph-dev" {
		t.Fatalf("unexpected serviceName %v", cfg["serviceName"])
	}

	if len(result.Diagnostics) != 0 {
		t.Fatalf("expected no diagnostics, got %v", result.Diagnostics)
	}
}

func TestValidateValidObject(t *testing.T) {
	schema := fixture("service.schema.json")
	obj := map[string]any{
		"serviceName": "intelgraph-api",
		"port":        8080,
		"mode":        "production",
		"database": map[string]any{
			"url": "https://example.com/db",
		},
	}

	diags, err := configguard.Validate(obj, schema)
	if err != nil {
		t.Fatalf("validate returned error: %v", err)
	}

	if len(diags) != 0 {
		t.Fatalf("expected no diagnostics, got %v", diags)
	}
}
