package ledger

import (
	"bufio"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"
)

// Attribute is a key/value pair embedded in ledger entries.
type Attribute struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// EntryPayload represents the canonical material that is hashed and signed.
type EntryPayload struct {
	Index      int         `json:"index"`
	Timestamp  time.Time   `json:"timestamp"`
	Event      string      `json:"event"`
	RequestID  string      `json:"requestId,omitempty"`
	TokenID    string      `json:"tokenId,omitempty"`
	Attributes []Attribute `json:"attributes,omitempty"`
	PrevHash   string      `json:"prevHash,omitempty"`
}

// Entry is the persisted ledger record.
type Entry struct {
	EntryPayload
	Hash      string `json:"hash"`
	Signature string `json:"signature"`
}

// Ledger implements an append-only, signed log of service events.
type Ledger struct {
	mu       sync.Mutex
	path     string
	private  ed25519.PrivateKey
	public   ed25519.PublicKey
	lastHash string
	index    int
}

// New constructs or resumes a ledger from disk.
func New(path string, secretKey []byte) (*Ledger, error) {
	if len(secretKey) != ed25519.SeedSize {
		return nil, fmt.Errorf("ledger secret key must be %d bytes", ed25519.SeedSize)
	}
	priv := ed25519.NewKeyFromSeed(secretKey)
	ledger := &Ledger{
		path:    path,
		private: priv,
		public:  priv.Public().(ed25519.PublicKey),
	}
	if err := ledger.bootstrap(); err != nil {
		return nil, err
	}
	return ledger, nil
}

func (l *Ledger) bootstrap() error {
	file, err := os.Open(l.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		var entry Entry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			return fmt.Errorf("failed to parse ledger entry: %w", err)
		}
		if err := l.verifyEntry(entry); err != nil {
			return fmt.Errorf("ledger integrity violation: %w", err)
		}
		l.index = entry.Index
		l.lastHash = entry.Hash
	}
	return scanner.Err()
}

// Append adds an event to the ledger.
func (l *Ledger) Append(event, requestID, tokenID string, attrs []Attribute) (Entry, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	payload := EntryPayload{
		Index:      l.index + 1,
		Timestamp:  time.Now().UTC(),
		Event:      event,
		RequestID:  requestID,
		TokenID:    tokenID,
		Attributes: sortAttributes(attrs),
		PrevHash:   l.lastHash,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return Entry{}, err
	}
	sum := sha256.Sum256(payloadBytes)
	hash := base64.StdEncoding.EncodeToString(sum[:])
	sig := ed25519.Sign(l.private, sum[:])

	entry := Entry{EntryPayload: payload, Hash: hash, Signature: base64.StdEncoding.EncodeToString(sig)}

	if err := l.appendToDisk(entry); err != nil {
		return Entry{}, err
	}
	l.index = payload.Index
	l.lastHash = hash
	return entry, nil
}

func (l *Ledger) appendToDisk(entry Entry) error {
	file, err := os.OpenFile(l.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer file.Close()
	enc := json.NewEncoder(file)
	if err := enc.Encode(entry); err != nil {
		return err
	}
	return nil
}

func sortAttributes(attrs []Attribute) []Attribute {
	cp := append([]Attribute{}, attrs...)
	sort.Slice(cp, func(i, j int) bool { return cp[i].Key < cp[j].Key })
	return cp
}

func (l *Ledger) verifyEntry(entry Entry) error {
	payloadBytes, err := json.Marshal(entry.EntryPayload)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(payloadBytes)
	decodedSig, err := base64.StdEncoding.DecodeString(entry.Signature)
	if err != nil {
		return err
	}
	if !ed25519.Verify(l.public, sum[:], decodedSig) {
		return errors.New("invalid ledger signature")
	}
	if entry.Hash != base64.StdEncoding.EncodeToString(sum[:]) {
		return errors.New("hash mismatch")
	}
	if entry.EntryPayload.Index != 1 && entry.EntryPayload.PrevHash == "" {
		return errors.New("missing prev hash")
	}
	if l.lastHash != "" && entry.EntryPayload.PrevHash != l.lastHash {
		return fmt.Errorf("broken chain: expected %s got %s", l.lastHash, entry.EntryPayload.PrevHash)
	}
	return nil
}

// PublicKey returns the ledger public key as base64.
func (l *Ledger) PublicKey() string {
	return base64.StdEncoding.EncodeToString(l.public)
}

// VerifyFile performs offline verification for a ledger file.
func VerifyFile(path string, publicKey ed25519.PublicKey) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	var prevHash string
	var index int
	for scanner.Scan() {
		var entry Entry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			return err
		}
		payloadBytes, err := json.Marshal(entry.EntryPayload)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(payloadBytes)
		decodedSig, err := base64.StdEncoding.DecodeString(entry.Signature)
		if err != nil {
			return err
		}
		if !ed25519.Verify(publicKey, sum[:], decodedSig) {
			return fmt.Errorf("invalid signature at index %d", entry.Index)
		}
		if entry.Hash != base64.StdEncoding.EncodeToString(sum[:]) {
			return fmt.Errorf("hash mismatch at index %d", entry.Index)
		}
		if entry.Index != index+1 {
			return fmt.Errorf("unexpected index %d", entry.Index)
		}
		if index > 0 && entry.PrevHash != prevHash {
			return fmt.Errorf("chain mismatch at index %d", entry.Index)
		}
		prevHash = entry.Hash
		index = entry.Index
	}
	return scanner.Err()
}

// DecodePublicKey converts a base64 string into a public key instance.
func DecodePublicKey(b64 string) (ed25519.PublicKey, error) {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, err
	}
	if len(raw) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("expected %d bytes public key", ed25519.PublicKeySize)
	}
	return ed25519.PublicKey(raw), nil
}

// DecodePrivateSeed decodes a base64-encoded ed25519 seed.
func DecodePrivateSeed(b64 string) ([]byte, error) {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, err
	}
	if len(raw) != ed25519.SeedSize {
		return nil, fmt.Errorf("expected %d byte seed", ed25519.SeedSize)
	}
	return raw, nil
}
