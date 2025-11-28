package sealed

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"errors"
)

// Storage provides enclave-local sealing primitives.
type Storage struct{}

func NewStorage() *Storage {
	return &Storage{}
}

// Seal encrypts plaintext with an attestation-bound key.
func (s *Storage) Seal(plaintext, measurement []byte) ([]byte, error) {
	if len(plaintext) == 0 {
		return nil, errors.New("plaintext required")
	}
	key := sha256.Sum256(measurement)
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonceSeed := sha256.Sum256(measurement)
	nonce := nonceSeed[:gcm.NonceSize()]
	sealed := gcm.Seal(nil, nonce, plaintext, nil)
	return sealed, nil
}

// Unseal decrypts data inside the enclave.
func (s *Storage) Unseal(ciphertext, measurement []byte) ([]byte, error) {
	key := sha256.Sum256(measurement)
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonceSeed := sha256.Sum256(measurement)
	nonce := nonceSeed[:gcm.NonceSize()]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
