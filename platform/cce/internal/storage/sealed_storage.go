package storage

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// SealedStorage performs envelope encryption inside enclave boundaries.
type SealedStorage struct {
	key []byte
}

// NewSealedStorage derives an enclave-local key from the provided material.
func NewSealedStorage(rawKey []byte) (*SealedStorage, error) {
	if len(rawKey) < 32 {
		return nil, errors.New("seal key too short")
	}
	key := make([]byte, 32)
	copy(key, rawKey[:32])
	return &SealedStorage{key: key}, nil
}

// Seal encrypts data with AES-GCM. The kmsWrappedKey is required to simulate unwrapping inside the enclave.
func (s *SealedStorage) Seal(plaintext []byte, kmsWrappedKey string) (string, error) {
	if kmsWrappedKey == "" {
		return "", errors.New("kms unwrap required inside enclave")
	}
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return "", fmt.Errorf("cipher init: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm init: %w", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce generation: %w", err)
	}
	sealed := gcm.Seal(nonce, nonce, plaintext, []byte(kmsWrappedKey))
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Open decrypts a sealed payload.
func (s *SealedStorage) Open(sealed string, kmsWrappedKey string) ([]byte, error) {
	if kmsWrappedKey == "" {
		return nil, errors.New("kms unwrap required")
	}
	data, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return nil, fmt.Errorf("cipher init: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm init: %w", err)
	}
	if len(data) < gcm.NonceSize() {
		return nil, errors.New("sealed data too short")
	}
	nonce := data[:gcm.NonceSize()]
	ciphertext := data[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, []byte(kmsWrappedKey))
}
