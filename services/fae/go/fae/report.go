package fae

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/json"
)

// GenerateReport generates a deterministic JSON document with a signature.
func GenerateReport(payload any, secret string) ([]byte, error) {
	canonical, err := canonicalJSON(map[string]any{"payload": payload})
	if err != nil {
		return nil, err
	}
	sig := hmac.New(sha256.New, []byte(secret))
	sig.Write(canonical)
	signature := sig.Sum(nil)
	report, err := canonicalJSON(map[string]any{
		"payload":   payload,
		"signature": encodeHex(signature),
	})
	if err != nil {
		return nil, err
	}
	return report, nil
}

// VerifyReport verifies the signature against the secret.
func VerifyReport(report []byte, secret string) (bool, error) {
	var document map[string]any
	if err := json.Unmarshal(report, &document); err != nil {
		return false, err
	}
	signature, _ := document["signature"].(string)
	payload := map[string]any{"payload": document["payload"]}
	canonical, err := canonicalJSON(payload)
	if err != nil {
		return false, err
	}
	sig := hmac.New(sha256.New, []byte(secret))
	sig.Write(canonical)
	expected := encodeHex(sig.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected)), nil
}

func canonicalJSON(payload any) ([]byte, error) {
	return json.Marshal(payload)
}

func encodeHex(data []byte) string {
	const hexdigits = "0123456789abcdef"
	dst := make([]byte, len(data)*2)
	for i, b := range data {
		dst[i*2] = hexdigits[b>>4]
		dst[i*2+1] = hexdigits[b&0x0f]
	}
	return string(dst)
}
