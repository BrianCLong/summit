package attestation

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

// Quote represents a simplified attestation quote used for offline validation.
type Quote struct {
	ID          string
	Region      string
	Measurement string
}

// Verifier checks attestation quotes against manifest expectations.
type Verifier struct {
	allowedRegions map[string]struct{}
	expectedHash   string
	quotes         map[string]Quote
}

// NewVerifier constructs a verifier using expected measurement and regions.
func NewVerifier(expectedHash string, regions []string, knownQuotes []Quote) *Verifier {
	allowed := make(map[string]struct{}, len(regions))
	for _, r := range regions {
		allowed[strings.TrimSpace(r)] = struct{}{}
	}
	quoteMap := make(map[string]Quote, len(knownQuotes))
	for _, q := range knownQuotes {
		quoteMap[q.ID] = q
	}
	return &Verifier{
		allowedRegions: allowed,
		expectedHash:   strings.ToLower(expectedHash),
		quotes:         quoteMap,
	}
}

// Verify ensures a quote matches the manifest and is region allowed.
func (v *Verifier) Verify(rawQuote string, manifestHash string, region string) error {
	if _, ok := v.allowedRegions[region]; !ok {
		return fmt.Errorf("region %s not allowed", region)
	}
	parsed, err := ParseQuote(rawQuote)
	if err != nil {
		return err
	}
	expected := v.expectedHash
	if manifestHash != "" {
		expected = strings.ToLower(manifestHash)
	}
	if parsed.Measurement != expected {
		return fmt.Errorf("measurement mismatch: got %s", parsed.Measurement)
	}
	if parsed.Region != region {
		return fmt.Errorf("quote region %s does not match request %s", parsed.Region, region)
	}
	return nil
}

// ParseQuote extracts fields from a pipe-delimited quote string.
func ParseQuote(raw string) (Quote, error) {
	if raw == "" {
		return Quote{}, errors.New("quote missing")
	}
	parts := strings.Split(raw, ":")
	if len(parts) < 4 {
		return Quote{}, errors.New("quote malformed")
	}
	measurement := strings.ToLower(parts[len(parts)-1])
	id := parts[1]
	region := parts[2]
	return Quote{ID: id, Region: region, Measurement: measurement}, nil
}

// DeriveMeasurement deterministically hashes payloads for manifest pinning.
func DeriveMeasurement(payload string) string {
	h := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(h[:])
}
