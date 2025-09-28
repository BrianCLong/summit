package signature

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

// Signer produces HMAC-SHA256 signatures for manifests.
type Signer struct {
	secret []byte
}

// NewSigner constructs a Signer using the provided secret.
func NewSigner(secret string) *Signer {
	if secret == "" {
		secret = "gcm-development-secret"
	}
	return &Signer{secret: []byte(secret)}
}

// Sign marshals the data as JSON and returns an HMAC digest.
func (s *Signer) Sign(data any) (string, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	mac := hmac.New(sha256.New, s.secret)
	if _, err := mac.Write(payload); err != nil {
		return "", err
	}
	return hex.EncodeToString(mac.Sum(nil)), nil
}
