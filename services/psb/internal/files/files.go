package files

import (
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"

	"github.com/summit/psb/internal/model"
)

// LoadDataset reads a dataset JSON file into memory.
func LoadDataset(path string) (model.Dataset, error) {
	file, err := os.Open(path)
	if err != nil {
		return model.Dataset{}, fmt.Errorf("unable to open dataset: %w", err)
	}
	defer file.Close()

	var dataset model.Dataset
	if err := json.NewDecoder(file).Decode(&dataset); err != nil {
		return model.Dataset{}, fmt.Errorf("invalid dataset: %w", err)
	}
	return dataset, nil
}

// LoadPrivateKey reads and decodes a hex encoded Ed25519 private key.
func LoadPrivateKey(path string) (ed25519.PrivateKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("unable to read private key: %w", err)
	}
	cleaned := stripWhitespace(data)
	decoded := make([]byte, hex.DecodedLen(len(cleaned)))
	n, err := hex.Decode(decoded, cleaned)
	if err != nil {
		return nil, fmt.Errorf("invalid private key encoding: %w", err)
	}
	decoded = decoded[:n]
	if len(decoded) != ed25519.PrivateKeySize {
		return nil, errors.New("ed25519 private key must be 64 bytes")
	}
	return ed25519.PrivateKey(decoded), nil
}

// WriteJSON writes the payload to the provided path. When path is empty the
// payload is encoded to stdout.
func WriteJSON(path string, payload any) error {
	var out *os.File
	var err error
	if path == "" {
		out = os.Stdout
	} else {
		out, err = os.Create(path)
		if err != nil {
			return fmt.Errorf("unable to create %s: %w", path, err)
		}
		defer out.Close()
	}

	encoder := json.NewEncoder(out)
	encoder.SetIndent("", "  ")
	return encoder.Encode(payload)
}

func stripWhitespace(data []byte) []byte {
	cleaned := make([]byte, 0, len(data))
	for _, b := range data {
		switch b {
		case '\n', '\r', '\t', ' ':
			continue
		}
		cleaned = append(cleaned, b)
	}
	return cleaned
}
