package core

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"
)

// RequestStatus enumerates the lifecycle states for a request.
type RequestStatus string

const (
	StatusPending  RequestStatus = "pending"
	StatusApproved RequestStatus = "approved"
	StatusDenied   RequestStatus = "denied"
)

// Request captures the approval state for a tool issuance request.
type Request struct {
	ID        string               `json:"id"`
	Requester string               `json:"requester"`
	Tool      string               `json:"tool"`
	Purpose   string               `json:"purpose"`
	Scopes    []string             `json:"scopes"`
	ExpiresAt time.Time            `json:"expiresAt"`
	CreatedAt time.Time            `json:"createdAt"`
	Status    RequestStatus        `json:"status"`
	Approvals map[string]time.Time `json:"approvals"`
	Denials   map[string]time.Time `json:"denials"`
	TokenID   string               `json:"tokenId"`
}

// Token represents an issued secret with attenuation metadata.
type Token struct {
	ID        string    `json:"id"`
	RequestID string    `json:"requestId"`
	ParentID  string    `json:"parentId,omitempty"`
	Scopes    []string  `json:"scopes"`
	ExpiresAt time.Time `json:"expiresAt"`
	IssuedAt  time.Time `json:"issuedAt"`
	Secret    string    `json:"secret"`
}

// DeterministicRequestID returns a stable identifier for an issuance request.
func DeterministicRequestID(requester, tool, purpose string, scopes []string, expiresAt time.Time) (string, error) {
	normalized := append([]string{}, scopes...)
	sort.Strings(normalized)
	payload := map[string]any{
		"requester": requester,
		"tool":      tool,
		"purpose":   purpose,
		"scopes":    normalized,
		"expiresAt": expiresAt.UTC().Format(time.RFC3339Nano),
	}
	bytes, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:]), nil
}

// CloneScopes returns a copy of scopes.
func CloneScopes(in []string) []string {
	cp := append([]string{}, in...)
	return cp
}

// IsSubset returns true when child is a subset of parent.
func IsSubset(parent, child []string) bool {
	parentSet := map[string]struct{}{}
	for _, s := range parent {
		parentSet[strings.ToLower(s)] = struct{}{}
	}
	for _, s := range child {
		if _, ok := parentSet[strings.ToLower(s)]; !ok {
			return false
		}
	}
	return true
}
