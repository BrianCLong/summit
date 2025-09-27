package storage

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/summit/qset/internal/core"
)

// Memory is an in-memory implementation of the store backend.
type Memory struct {
	mu       sync.Mutex
	requests map[string]*core.Request
	tokens   map[string]*core.Token
}

// NewMemory constructs a Memory store.
func NewMemory() *Memory {
	return &Memory{
		requests: make(map[string]*core.Request),
		tokens:   make(map[string]*core.Token),
	}
}

// UpsertRequest inserts or returns an existing request based on deterministic ID.
func (m *Memory) UpsertRequest(req *core.Request) *core.Request {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.requests[req.ID]; ok {
		return cloneRequest(existing)
	}
	stored := cloneRequest(req)
	m.requests[req.ID] = stored
	return cloneRequest(stored)
}

// GetRequest returns a copy of the stored request.
func (m *Memory) GetRequest(id string) (*core.Request, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	req, ok := m.requests[id]
	if !ok {
		return nil, false
	}
	return cloneRequest(req), true
}

// UpdateRequest mutates an existing request.
func (m *Memory) UpdateRequest(req *core.Request) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.requests[req.ID]; !ok {
		return errors.New("request not found")
	}
	m.requests[req.ID] = cloneRequest(req)
	return nil
}

// MintToken persists a token. Token IDs are generated if empty.
func (m *Memory) MintToken(tok *core.Token) (*core.Token, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if tok.ID == "" {
		tok.ID = generateID()
	}
	if _, exists := m.tokens[tok.ID]; exists {
		return nil, fmt.Errorf("token %s already exists", tok.ID)
	}
	stored := cloneToken(tok)
	m.tokens[tok.ID] = stored
	return cloneToken(stored), nil
}

// GetToken fetches a token by ID.
func (m *Memory) GetToken(id string) (*core.Token, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	tok, ok := m.tokens[id]
	if !ok {
		return nil, false
	}
	return cloneToken(tok), true
}

func cloneRequest(in *core.Request) *core.Request {
	cp := *in
	cp.Scopes = core.CloneScopes(in.Scopes)
	cp.Approvals = map[string]time.Time{}
	for k, v := range in.Approvals {
		cp.Approvals[k] = v
	}
	cp.Denials = map[string]time.Time{}
	for k, v := range in.Denials {
		cp.Denials[k] = v
	}
	return &cp
}

func cloneToken(in *core.Token) *core.Token {
	cp := *in
	cp.Scopes = core.CloneScopes(in.Scopes)
	return &cp
}

func GenerateSecret() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}

func generateID() string {
	return GenerateSecret()
}
