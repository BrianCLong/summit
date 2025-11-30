package sealed

import "testing"

func TestSealAndUnseal(t *testing.T) {
	storage := NewStorage()
	measurement := []byte("quote")
	sealed, err := storage.Seal([]byte("hello"), measurement)
	if err != nil {
		t.Fatalf("seal failed: %v", err)
	}

	opened, err := storage.Unseal(sealed, measurement)
	if err != nil {
		t.Fatalf("unseal failed: %v", err)
	}

	if string(opened) != "hello" {
		t.Fatalf("unexpected unsealed data: %s", opened)
	}
}
