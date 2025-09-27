package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/summit/qset/internal/config"
	"github.com/summit/qset/internal/core"
	"github.com/summit/qset/internal/ledger"
	"github.com/summit/qset/internal/storage"
)

// Server is the HTTP front-end for the QSET service.
type Server struct {
	cfg          config.Config
	store        *storage.Memory
	ledger       *ledger.Ledger
	approverKeys map[string]string
	tools        map[string]config.ToolConfig
}

// New constructs a new Server instance.
func New(cfg config.Config, store *storage.Memory, ledger *ledger.Ledger) *Server {
	keys := make(map[string]string, len(cfg.Approvers))
	for _, appr := range cfg.Approvers {
		keys[strings.TrimSpace(appr.Key)] = appr.Name
	}
	tools := make(map[string]config.ToolConfig, len(cfg.Tools))
	for _, tool := range cfg.Tools {
		tools[tool.ID] = tool
	}
	return &Server{
		cfg:          cfg,
		store:        store,
		ledger:       ledger,
		approverKeys: keys,
		tools:        tools,
	}
}

// Handler wires the server into an http.Handler.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/requests", s.handleRequests)
	mux.HandleFunc("/requests/", s.handleRequestByID)
	mux.HandleFunc("/tokens/", s.handleTokenByID)
	mux.HandleFunc("/ledger/public-key", s.handlePublicKey)
	return mux
}

func (s *Server) handleRequests(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		s.handleCreateRequest(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleRequestByID(w http.ResponseWriter, r *http.Request) {
	segments := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(segments) < 2 {
		http.NotFound(w, r)
		return
	}
	id := segments[1]
	if len(segments) == 2 && r.Method == http.MethodGet {
		s.handleGetRequest(w, r, id)
		return
	}
	if len(segments) == 3 {
		switch segments[2] {
		case "approve":
			if r.Method == http.MethodPost {
				s.handleApprove(w, r, id)
				return
			}
		case "deny":
			if r.Method == http.MethodPost {
				s.handleDeny(w, r, id)
				return
			}
		case "mint":
			if r.Method == http.MethodPost {
				s.handleMint(w, r, id)
				return
			}
		}
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func (s *Server) handleTokenByID(w http.ResponseWriter, r *http.Request) {
	segments := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(segments) < 2 {
		http.NotFound(w, r)
		return
	}
	id := segments[1]
	if len(segments) == 3 && segments[2] == "attenuate" && r.Method == http.MethodPost {
		s.handleAttenuate(w, r, id)
		return
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func (s *Server) handlePublicKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	respond(w, http.StatusOK, map[string]string{"publicKey": s.ledger.PublicKey()})
}

type createRequestInput struct {
	Requester string   `json:"requester"`
	Tool      string   `json:"tool"`
	Purpose   string   `json:"purpose"`
	Scopes    []string `json:"scopes"`
	ExpiresAt string   `json:"expiresAt"`
}

func (s *Server) handleCreateRequest(w http.ResponseWriter, r *http.Request) {
	var input createRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	tool, ok := s.tools[input.Tool]
	if !ok {
		http.Error(w, "unknown tool", http.StatusBadRequest)
		return
	}
	if input.Requester == "" || input.Purpose == "" {
		http.Error(w, "requester and purpose required", http.StatusBadRequest)
		return
	}
	if len(input.Scopes) == 0 {
		input.Scopes = core.CloneScopes(tool.Scopes)
	}
	if !core.IsSubset(tool.Scopes, input.Scopes) {
		http.Error(w, "requested scopes exceed tool policy", http.StatusBadRequest)
		return
	}
	var (
		expires         time.Time
		canonicalExpiry time.Time
	)
	if input.ExpiresAt == "" {
		expires = time.Now().Add(tool.MaxDuration.Duration)
		canonicalExpiry = time.Unix(0, 0).Add(tool.MaxDuration.Duration)
	} else {
		parsed, err := time.Parse(time.RFC3339, input.ExpiresAt)
		if err != nil {
			http.Error(w, "invalid expiresAt", http.StatusBadRequest)
			return
		}
		expires = parsed
		canonicalExpiry = expires
	}
	if expires.After(time.Now().Add(tool.MaxDuration.Duration)) {
		http.Error(w, "expiry exceeds tool policy", http.StatusBadRequest)
		return
	}
	expires = expires.UTC()
	id, err := core.DeterministicRequestID(input.Requester, input.Tool, input.Purpose, input.Scopes, canonicalExpiry.UTC())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if existing, ok := s.store.GetRequest(id); ok {
		respond(w, http.StatusOK, existing)
		return
	}
	req := &core.Request{
		ID:        id,
		Requester: input.Requester,
		Tool:      input.Tool,
		Purpose:   input.Purpose,
		Scopes:    core.CloneScopes(input.Scopes),
		ExpiresAt: expires,
		CreatedAt: time.Now().UTC(),
		Status:    core.StatusPending,
		Approvals: map[string]time.Time{},
		Denials:   map[string]time.Time{},
	}
	stored := s.store.UpsertRequest(req)
	_, _ = s.ledger.Append("request.created", stored.ID, "", []ledger.Attribute{
		{Key: "requester", Value: stored.Requester},
		{Key: "tool", Value: stored.Tool},
	})
	respond(w, http.StatusCreated, stored)
}

func (s *Server) handleGetRequest(w http.ResponseWriter, r *http.Request, id string) {
	req, ok := s.store.GetRequest(id)
	if !ok {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}
	respond(w, http.StatusOK, req)
}

func (s *Server) handleApprove(w http.ResponseWriter, r *http.Request, id string) {
	approver, err := s.authorizeApprover(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	req, ok := s.store.GetRequest(id)
	if !ok {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}
	if req.Status == core.StatusDenied {
		http.Error(w, "request denied", http.StatusConflict)
		return
	}
	if req.Status == core.StatusApproved && req.Approvals[approver] != (time.Time{}) {
		respond(w, http.StatusOK, req)
		return
	}
	req.Approvals[approver] = time.Now().UTC()
	delete(req.Denials, approver)
	req.Status = s.resolveStatus(req)
	if err := s.store.UpdateRequest(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, _ = s.ledger.Append("request.approved", req.ID, "", []ledger.Attribute{{Key: "approver", Value: approver}})
	respond(w, http.StatusOK, req)
}

func (s *Server) handleDeny(w http.ResponseWriter, r *http.Request, id string) {
	approver, err := s.authorizeApprover(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	req, ok := s.store.GetRequest(id)
	if !ok {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}
	if req.TokenID != "" {
		http.Error(w, "token already minted", http.StatusConflict)
		return
	}
	req.Denials[approver] = time.Now().UTC()
	delete(req.Approvals, approver)
	req.Status = core.StatusDenied
	if err := s.store.UpdateRequest(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, _ = s.ledger.Append("request.denied", req.ID, "", []ledger.Attribute{{Key: "approver", Value: approver}})
	respond(w, http.StatusOK, req)
}

func (s *Server) handleMint(w http.ResponseWriter, r *http.Request, id string) {
	approver, err := s.authorizeApprover(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	_ = approver // minting requires authenticated operator but we don't record
	req, ok := s.store.GetRequest(id)
	if !ok {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}
	if req.Status != core.StatusApproved {
		http.Error(w, "quorum not satisfied", http.StatusForbidden)
		return
	}
	if req.TokenID != "" {
		token, ok := s.store.GetToken(req.TokenID)
		if !ok {
			http.Error(w, "token missing", http.StatusInternalServerError)
			return
		}
		respond(w, http.StatusOK, token)
		return
	}
	secret := storage.GenerateSecret()
	token := &core.Token{
		RequestID: req.ID,
		Scopes:    core.CloneScopes(req.Scopes),
		ExpiresAt: req.ExpiresAt,
		IssuedAt:  time.Now().UTC(),
		Secret:    secret,
	}
	minted, err := s.store.MintToken(token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.TokenID = minted.ID
	if err := s.store.UpdateRequest(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, _ = s.ledger.Append("token.minted", req.ID, minted.ID, []ledger.Attribute{{Key: "scopes", Value: strings.Join(minted.Scopes, ",")}})
	respond(w, http.StatusCreated, minted)
}

type attenuateInput struct {
	Scopes    []string `json:"scopes"`
	ExpiresAt string   `json:"expiresAt"`
}

func (s *Server) handleAttenuate(w http.ResponseWriter, r *http.Request, id string) {
	approver, err := s.authorizeApprover(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	_ = approver
	parent, ok := s.store.GetToken(id)
	if !ok {
		http.Error(w, "token not found", http.StatusNotFound)
		return
	}
	var input attenuateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(input.Scopes) == 0 {
		input.Scopes = core.CloneScopes(parent.Scopes)
	}
	if !core.IsSubset(parent.Scopes, input.Scopes) {
		http.Error(w, "attenuation must reduce scopes", http.StatusBadRequest)
		return
	}
	expires := parent.ExpiresAt
	if input.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, input.ExpiresAt)
		if err != nil {
			http.Error(w, "invalid expiresAt", http.StatusBadRequest)
			return
		}
		expires = parsed
	}
	if expires.After(parent.ExpiresAt) {
		http.Error(w, "attenuation cannot extend expiry", http.StatusBadRequest)
		return
	}
	secret := storage.GenerateSecret()
	token := &core.Token{
		RequestID: parent.RequestID,
		ParentID:  parent.ID,
		Scopes:    core.CloneScopes(input.Scopes),
		ExpiresAt: expires,
		IssuedAt:  time.Now().UTC(),
		Secret:    secret,
	}
	minted, err := s.store.MintToken(token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, _ = s.ledger.Append("token.attenuated", parent.RequestID, minted.ID, []ledger.Attribute{{Key: "parent", Value: parent.ID}})
	respond(w, http.StatusCreated, minted)
}

func (s *Server) authorizeApprover(r *http.Request) (string, error) {
	key := strings.TrimSpace(r.Header.Get("X-Approver-Key"))
	if key == "" {
		return "", errors.New("approver key required")
	}
	name, ok := s.approverKeys[key]
	if !ok {
		return "", errors.New("invalid approver key")
	}
	return name, nil
}

func (s *Server) resolveStatus(req *core.Request) core.RequestStatus {
	if len(req.Denials) > 0 {
		return core.StatusDenied
	}
	unique := make(map[string]struct{})
	for k := range req.Approvals {
		unique[k] = struct{}{}
	}
	if len(unique) >= s.cfg.Quorum {
		return core.StatusApproved
	}
	return core.StatusPending
}

func respond(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(v)
}

// ToolScopes exposes tool scopes for clients (useful in tests).
func (s *Server) ToolScopes(tool string) ([]string, bool) {
	cfg, ok := s.tools[tool]
	if !ok {
		return nil, false
	}
	scopes := append([]string{}, cfg.Scopes...)
	sort.Strings(scopes)
	return scopes, true
}
