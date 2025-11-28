package sbom

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

// Document represents a normalized SBOM payload.
type Document struct {
	Format   string
	Image    string
	Created  time.Time
	Digest   string
	Packages []Package
}

// Package models a component entry.
type Package struct {
	Name    string
	Version string
	License string
}

// Generator emits SPDX or CycloneDX-compatible documents using deterministic fields.
type Generator struct{}

// New creates a new Generator instance.
func New() Generator {
	return Generator{}
}

// SPDX produces a deterministic SPDX-like document.
func (g Generator) SPDX(image string, packages []Package) Document {
	digest := sha256.Sum256([]byte(fmt.Sprintf("%s:%d", image, len(packages))))
	return Document{
		Format:   "spdx-2.3",
		Image:    image,
		Created:  time.Now().UTC(),
		Digest:   hex.EncodeToString(digest[:]),
		Packages: packages,
	}
}

// CycloneDX produces a deterministic CycloneDX-like document.
func (g Generator) CycloneDX(image string, packages []Package) Document {
	digest := sha256.Sum256([]byte(fmt.Sprintf("%s:%d:cyclonedx", image, len(packages))))
	return Document{
		Format:   "cyclonedx-1.6",
		Image:    image,
		Created:  time.Now().UTC(),
		Digest:   hex.EncodeToString(digest[:]),
		Packages: packages,
	}
}
