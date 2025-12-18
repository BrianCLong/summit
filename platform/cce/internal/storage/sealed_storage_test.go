package storage

import (
	"encoding/base64"
	"testing"
)

func TestSealAndOpen(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef0123456789abcdef")
	store, err := NewSealedStorage(key)
	if err != nil {
		t.Fatalf("unexpected error creating storage: %v", err)
	}
	sealed, err := store.Seal([]byte("secret"), "kms-wrap")
	if err != nil {
		t.Fatalf("seal failed: %v", err)
	}
	opened, err := store.Open(sealed, "kms-wrap")
	if err != nil {
		t.Fatalf("open failed: %v", err)
	}
	if string(opened) != "secret" {
		t.Fatalf("expected secret, got %s", string(opened))
	}
}

func TestSealRequiresKMS(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef0123456789abcdef")
	store, _ := NewSealedStorage(key)
	if _, err := store.Seal([]byte("data"), ""); err == nil {
		t.Fatal("expected kms requirement error")
	}
}

func TestRejectShortKey(t *testing.T) {
	if _, err := NewSealedStorage([]byte("short")); err == nil {
		t.Fatal("expected key length error")
	}
}

func TestBase64Compatibility(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef0123456789abcdef")
	store, _ := NewSealedStorage(key)
	sealed, _ := store.Seal([]byte("echo"), "kms-wrap")
	if _, err := base64.StdEncoding.DecodeString(sealed); err != nil {
		t.Fatalf("sealed value not base64: %v", err)
	}
}
