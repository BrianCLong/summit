package testutil

import (
	"crypto/rand"
	"encoding/base64"
	"testing"
	"time"

	"github.com/summit/qset/internal/config"
	"github.com/summit/qset/internal/ledger"
	"github.com/summit/qset/internal/server"
	"github.com/summit/qset/internal/storage"
)

// Harness bundles together the runtime dependencies for integration tests.
type Harness struct {
	pubKey string
	Cfg    config.Config
	Store  *storage.Memory
	Ledger *ledger.Ledger
	Server *server.Server
}

// NewHarness constructs a ready-to-use Harness for tests.
func NewHarness(t *testing.T) *Harness {
	t.Helper()
	seed := make([]byte, 32)
	if _, err := rand.Read(seed); err != nil {
		t.Fatalf("rand: %v", err)
	}
	cfg := config.Config{
		Approvers: []config.ApproverConfig{
			{Name: "alice", Key: "alice-key"},
			{Name: "bob", Key: "bob-key"},
			{Name: "carol", Key: "carol-key"},
		},
		Quorum: 2,
		Tools: []config.ToolConfig{
			{
				ID:          "github",
				Description: "GitHub API",
				Scopes:      []string{"repo", "workflow", "org"},
				MaxDuration: config.Duration{Duration: 24 * time.Hour},
			},
		},
		Ledger: config.LedgerConfig{
			Path:      t.TempDir() + "/ledger.log",
			SecretKey: base64.StdEncoding.EncodeToString(seed),
		},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("config validation: %v", err)
	}
	led, err := ledger.New(cfg.Ledger.Path, seed)
	if err != nil {
		t.Fatalf("ledger: %v", err)
	}
	store := storage.NewMemory()
	srv := server.New(cfg, store, led)
	return &Harness{pubKey: led.PublicKey(), Cfg: cfg, Store: store, Ledger: led, Server: srv}
}

// PublicKey returns the ledger public key used by the harness.
func (h *Harness) PublicKey() string {
	return h.pubKey
}
