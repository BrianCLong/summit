package sbom

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Manifest struct {
	Image      string            `json:"image"`
	Format     string            `json:"format"`
	Generated  time.Time         `json:"generated"`
	Components []map[string]any  `json:"components"`
	Digest     string            `json:"digest"`
	Metadata   map[string]string `json:"metadata"`
}

func Generate(image, format, outDir string) (string, error) {
	if format != "spdx" && format != "cyclonedx" {
		return "", fmt.Errorf("unsupported format: %s", format)
	}
	sanitized := strings.NewReplacer("/", "_", ":", "_").Replace(image)
	digest := sha256.Sum256([]byte(image))
	manifest := Manifest{
		Image:     image,
		Format:    format,
		Generated: time.Now().UTC(),
		Components: []map[string]any{
			{"name": "root", "type": "container", "purl": fmt.Sprintf("pkg:container/%s", image)},
		},
		Digest: hex.EncodeToString(digest[:]),
		Metadata: map[string]string{
			"generator": "sca-go",
			"schema":    format,
		},
	}

	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(outDir, fmt.Sprintf("sbom-%s-%s.json", sanitized, format))
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	return path, nil
}
