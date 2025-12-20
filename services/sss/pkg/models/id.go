package models

import (
	"crypto/sha1"
	"encoding/hex"
)

// HashID generates a deterministic identifier for a finding using the provided parts.
func HashID(parts ...string) string {
	h := sha1.New()
	for _, part := range parts {
		_, _ = h.Write([]byte(part))
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}
