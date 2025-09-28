package pac

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
)

// HMACSigner implements ManifestSigner using HMAC-SHA256 signatures.
type HMACSigner struct {
	secret []byte
}

// NewHMACSigner creates a signer with the provided secret key bytes.
func NewHMACSigner(secret []byte) (*HMACSigner, error) {
	if len(secret) == 0 {
		return nil, errors.New("secret cannot be empty")
	}
	copyBuf := make([]byte, len(secret))
	copy(copyBuf, secret)
	return &HMACSigner{secret: copyBuf}, nil
}

// Sign generates a base64 encoded HMAC-SHA256 signature for the payload.
func (s *HMACSigner) Sign(payload []byte) (string, error) {
	if s == nil {
		return "", errors.New("signer is nil")
	}
	mac := hmac.New(sha256.New, s.secret)
	_, err := mac.Write(payload)
	if err != nil {
		return "", err
	}
	sum := mac.Sum(nil)
	return base64.StdEncoding.EncodeToString(sum), nil
}

// Verify checks the signature for the given payload.
func (s *HMACSigner) Verify(payload []byte, signature string) bool {
	if s == nil {
		return false
	}
	expected, err := s.Sign(payload)
	if err != nil {
		return false
	}
	expectedBytes, err := base64.StdEncoding.DecodeString(expected)
	if err != nil {
		return false
	}
	providedBytes, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return false
	}
	return hmac.Equal(expectedBytes, providedBytes)
}
