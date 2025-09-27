package ccmo

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTemplateSnapshots(t *testing.T) {
	renderer, err := NewTemplateRenderer()
	if err != nil {
		t.Fatalf("failed to init renderer: %v", err)
	}
	scenarios := []struct {
		name string
		key  TemplateKey
	}{
		{
			name: "email_welcome_en_us_light",
			key:  TemplateKey{Name: "welcome", Channel: string(ChannelEmail), Locale: "en_us", Dark: false},
		},
		{
			name: "email_welcome_es_dark",
			key:  TemplateKey{Name: "welcome", Channel: string(ChannelEmail), Locale: "es", Dark: true},
		},
	}

	data := map[string]any{
		"subject": "Consent Update",
		"name":    "Jordan",
		"body":    "Your control center is ready.",
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			actual, err := renderer.Render(scenario.key, data)
			if err != nil {
				t.Fatalf("render failed: %v", err)
			}
			snapshotPath := filepath.Join("templates", "testdata", scenario.name+".txt")
			expectedBytes, err := os.ReadFile(snapshotPath)
			if err != nil {
				t.Fatalf("failed to read snapshot: %v", err)
			}
			expected := string(expectedBytes)
			if actual != expected {
				t.Fatalf("snapshot mismatch\nexpected:\n%s\nactual:\n%s", expected, actual)
			}
		})
	}
}
