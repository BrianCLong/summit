package server

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	merklelog "github.com/summit/transparency/idtl/internal/log"
)

type Server struct {
	log    *merklelog.MerkleLog
	signer *Signer
	mux    *http.ServeMux
}

type appendRequest struct {
	ID             string            `json:"id"`
	Decision       string            `json:"decision"`
	Metadata       map[string]string `json:"metadata"`
	Redacted       bool              `json:"redacted"`
	Disclosure     string            `json:"disclosure"`
	DisclosureHash string            `json:"disclosure_hash"`
}

type appendResponse struct {
	Entry     merklelog.Entry          `json:"entry"`
	LeafIndex int                      `json:"leaf_index"`
	LeafHash  string                   `json:"leaf_hash"`
	STH       merklelog.SignedTreeHead `json:"sth"`
}

type proofResponse struct {
	LeafIndex int      `json:"leaf_index"`
	Proof     []string `json:"proof"`
	RootHash  string   `json:"root_hash"`
}

type consistencyResponse struct {
	OldSize int      `json:"old_size"`
	NewSize int      `json:"new_size"`
	Proof   []string `json:"proof"`
}

type disclosureRequest struct {
	Disclosure string `json:"disclosure"`
}

func New(seed []byte) (*Server, error) {
	signer, err := NewSigner(seed)
	if err != nil {
		return nil, err
	}
	log := merklelog.New(merklelog.WithSigner(func(data []byte) (string, error) {
		return signer.Sign(data)
	}, signer.PublicKey()))
	srv := &Server{
		log:    log,
		signer: signer,
		mux:    http.NewServeMux(),
	}
	srv.routes()
	return srv, nil
}

func (s *Server) routes() {
	s.mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	s.mux.HandleFunc("/tree/head", s.handleTreeHead)
	s.mux.HandleFunc("/tree/consistency", s.handleConsistency)
	s.mux.HandleFunc("/tree/history", s.handleHistory)
	s.mux.HandleFunc("/tree/pubkey", s.handlePubKey)
	s.mux.HandleFunc("/tree/leaves", s.handleLeafHashes)
	s.mux.HandleFunc("/entries", s.handleEntries)
	s.mux.HandleFunc("/entries/", s.handleEntry)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) Start(addr string) error {
	server := &http.Server{
		Addr:              addr,
		Handler:           s,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("IDTL service listening on %s", addr)
	return server.ListenAndServe()
}

func (s *Server) handleEntries(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		s.handleAppend(w, r)
	case http.MethodGet:
		s.handleListEntries(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleAppend(w http.ResponseWriter, r *http.Request) {
	var req appendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request payload", http.StatusBadRequest)
		return
	}
	if req.Redacted && req.Decision != "" {
		req.Decision = ""
	}
	if !req.Redacted && req.Decision == "" {
		http.Error(w, "decision text required for non-redacted entries", http.StatusBadRequest)
		return
	}
	if req.Redacted && req.Disclosure == "" && req.DisclosureHash == "" {
		http.Error(w, "redacted entries require a disclosure or disclosure_hash", http.StatusBadRequest)
		return
	}
	if req.Metadata == nil {
		req.Metadata = map[string]string{}
	}
	if req.ID == "" {
		req.ID = uuid.NewString()
	}
	entry := &merklelog.Entry{
		ID:        req.ID,
		Timestamp: time.Now().UTC(),
		Decision:  req.Decision,
		Redacted:  req.Redacted,
		Metadata:  req.Metadata,
	}
	if req.Redacted {
		disclosureHash := req.DisclosureHash
		if req.Disclosure != "" {
			sum := sha256.Sum256([]byte(req.Disclosure))
			disclosureHash = base64.StdEncoding.EncodeToString(sum[:])
		}
		if disclosureHash == "" {
			http.Error(w, "disclosure hash required for redacted entries", http.StatusBadRequest)
			return
		}
		entry.DisclosureHash = disclosureHash
	}
	index, sth, err := s.log.Append(entry)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	leafHash, _ := s.log.LeafHash(index)
	resp := appendResponse{
		Entry:     *entry,
		LeafIndex: index,
		LeafHash:  base64.StdEncoding.EncodeToString(leafHash),
		STH:       sth,
	}
	writeJSON(w, http.StatusCreated, resp)
}

func (s *Server) handleListEntries(w http.ResponseWriter, r *http.Request) {
	entries := s.log.Entries()
	writeJSON(w, http.StatusOK, entries)
}

func (s *Server) handleEntry(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/entries/")
	segments := strings.Split(path, "/")
	if len(segments) == 0 {
		http.NotFound(w, r)
		return
	}
	id := segments[0]
	entry, index, err := s.log.EntryByID(id)
	if err != nil {
		http.Error(w, "entry not found", http.StatusNotFound)
		return
	}
	if len(segments) == 1 {
		switch r.Method {
		case http.MethodGet:
			writeJSON(w, http.StatusOK, entry)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	switch segments[1] {
	case "proof":
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		proof, err := s.log.InclusionProof(index)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		root, err := s.currentRoot()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, proofResponse{
			LeafIndex: index,
			Proof:     merklelog.EncodeProof(proof),
			RootHash:  base64.StdEncoding.EncodeToString(root),
		})
	case "disclosure":
		switch r.Method {
		case http.MethodPost:
			var req disclosureRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid disclosure payload", http.StatusBadRequest)
				return
			}
			if req.Disclosure == "" {
				http.Error(w, "disclosure text required", http.StatusBadRequest)
				return
			}
			sum := sha256.Sum256([]byte(req.Disclosure))
			provided := base64.StdEncoding.EncodeToString(sum[:])
			if provided != entry.DisclosureHash {
				http.Error(w, "disclosure hash mismatch", http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) handleTreeHead(w http.ResponseWriter, r *http.Request) {
	sth, err := s.log.LatestSTH()
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, sth)
}

func (s *Server) handleConsistency(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	oldSize, err := strconv.Atoi(query.Get("from"))
	if err != nil {
		http.Error(w, "invalid from parameter", http.StatusBadRequest)
		return
	}
	newSize, err := strconv.Atoi(query.Get("to"))
	if err != nil {
		http.Error(w, "invalid to parameter", http.StatusBadRequest)
		return
	}
	proof, err := s.log.ConsistencyProof(oldSize, newSize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, consistencyResponse{OldSize: oldSize, NewSize: newSize, Proof: merklelog.EncodeProof(proof)})
}

func (s *Server) handleHistory(w http.ResponseWriter, r *http.Request) {
	st := s.log.AllSTHs()
	writeJSON(w, http.StatusOK, st)
}

func (s *Server) handlePubKey(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"public_key": s.log.PublicKey()})
}

func (s *Server) handleLeafHashes(w http.ResponseWriter, r *http.Request) {
	limitParam := r.URL.Query().Get("limit")
	if limitParam == "" {
		http.Error(w, "limit parameter required", http.StatusBadRequest)
		return
	}
	limit, err := strconv.Atoi(limitParam)
	if err != nil {
		http.Error(w, "invalid limit", http.StatusBadRequest)
		return
	}
	hashes, err := s.log.LeafHashes(limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	encoded := merklelog.EncodeProof(hashes)
	writeJSON(w, http.StatusOK, map[string]interface{}{"leaf_hashes": encoded})
}

func (s *Server) currentRoot() ([]byte, error) {
	sth, err := s.log.LatestSTH()
	if err != nil {
		return nil, err
	}
	if sth.RootHash == "" {
		return nil, errors.New("root hash unavailable")
	}
	return base64.StdEncoding.DecodeString(sth.RootHash)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		fmt.Fprintf(os.Stderr, "failed to encode response: %v", err)
	}
}

func LoadSeedFromEnv() []byte {
	seed := os.Getenv("IDTL_SIGNING_SEED")
	return []byte(seed)
}
