package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"rcsi/internal/index"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	cmd := os.Args[1]
	args := os.Args[2:]

	switch cmd {
	case "serve":
		if err := cmdServe(args); err != nil {
			log.Fatalf("serve: %v", err)
		}
	case "reconcile":
		if err := cmdReconcile(args); err != nil {
			log.Fatalf("reconcile: %v", err)
		}
	case "snapshot":
		if err := cmdSnapshot(args); err != nil {
			log.Fatalf("snapshot: %v", err)
		}
	case "proof":
		if err := cmdProof(args); err != nil {
			log.Fatalf("proof: %v", err)
		}
	default:
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintf(os.Stderr, "rcsi <serve|reconcile|snapshot|proof> [flags]\n")
}

func cmdServe(args []string) error {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	addr := fs.String("addr", ":8080", "listen address")
	corpus := fs.String("corpus", "", "path to corpus fixture")
	redactions := fs.String("redactions", "", "path to redaction fixture")
	if err := fs.Parse(args); err != nil {
		return err
	}

	idx := index.New()
	if err := hydrateIndex(idx, *corpus, *redactions); err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/documents", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var doc index.Document
		if err := decodeJSON(r, &doc); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := idx.AddDocument(doc); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{"status": "indexed"})
	})

	mux.HandleFunc("/redactions/document", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			DocumentID string `json:"documentId"`
			Reason     string `json:"reason"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := idx.RedactDocument(payload.DocumentID, payload.Reason); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{"status": "redacted"})
	})

	mux.HandleFunc("/redactions/term", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			Term       string `json:"term"`
			DocumentID string `json:"documentId"`
			Reason     string `json:"reason"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := idx.RedactTerm(payload.Term, payload.DocumentID, payload.Reason); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{"status": "redacted"})
	})

	mux.HandleFunc("/reindex", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload struct {
			DocumentIDs []string `json:"documentIds"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		idx.SelectiveReindex(payload.DocumentIDs)
		writeJSON(w, http.StatusAccepted, map[string]any{"status": "reindexed"})
	})

	mux.HandleFunc("/reconcile", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		report := idx.Reconcile()
		writeJSON(w, http.StatusOK, report)
	})

	mux.HandleFunc("/snapshot", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		snapshot := idx.Snapshot()
		writeJSON(w, http.StatusOK, snapshot)
	})

	mux.HandleFunc("/proofs/doc/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		id := strings.TrimPrefix(r.URL.Path, "/proofs/doc/")
		proof, err := idx.NegativeProofDocument(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusOK, proof)
	})

	mux.HandleFunc("/proofs/term/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		path := strings.TrimPrefix(r.URL.Path, "/proofs/term/")
		documentID := r.URL.Query().Get("documentId")
		proof, err := idx.NegativeProofTerm(path, documentID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusOK, proof)
	})

	log.Printf("rcsi listening on %s", *addr)
	return http.ListenAndServe(*addr, mux)
}

func cmdReconcile(args []string) error {
	fs := flag.NewFlagSet("reconcile", flag.ContinueOnError)
	corpus := fs.String("corpus", "", "path to corpus fixture")
	redactions := fs.String("redactions", "", "path to redaction fixture")
	if err := fs.Parse(args); err != nil {
		return err
	}

	idx := index.New()
	if err := hydrateIndex(idx, *corpus, *redactions); err != nil {
		return err
	}
	report := idx.Reconcile()
	return encodeToStdout(report)
}

func cmdSnapshot(args []string) error {
	fs := flag.NewFlagSet("snapshot", flag.ContinueOnError)
	corpus := fs.String("corpus", "", "path to corpus fixture")
	redactions := fs.String("redactions", "", "path to redaction fixture")
	if err := fs.Parse(args); err != nil {
		return err
	}

	idx := index.New()
	if err := hydrateIndex(idx, *corpus, *redactions); err != nil {
		return err
	}
	snapshot := idx.Snapshot()
	return encodeToStdout(snapshot)
}

func cmdProof(args []string) error {
	fs := flag.NewFlagSet("proof", flag.ContinueOnError)
	kind := fs.String("kind", "document", "proof kind: document|term")
	corpus := fs.String("corpus", "", "path to corpus fixture")
	redactions := fs.String("redactions", "", "path to redaction fixture")
	documentID := fs.String("document", "", "document identifier")
	term := fs.String("term", "", "term (for term proofs)")
	if err := fs.Parse(args); err != nil {
		return err
	}

	idx := index.New()
	if err := hydrateIndex(idx, *corpus, *redactions); err != nil {
		return err
	}

	switch *kind {
	case "document":
		proof, err := idx.NegativeProofDocument(*documentID)
		if err != nil {
			return err
		}
		return encodeToStdout(proof)
	case "term":
		proof, err := idx.NegativeProofTerm(*term, *documentID)
		if err != nil {
			return err
		}
		return encodeToStdout(proof)
	default:
		return fmt.Errorf("unsupported proof kind %s", *kind)
	}
}

func hydrateIndex(idx *index.Index, corpusPath, redactionsPath string) error {
	docs, err := loadDocuments(corpusPath)
	if err != nil {
		return err
	}
	events, err := loadRedactions(redactionsPath)
	if err != nil {
		return err
	}
	return idx.ApplyFixtures(docs, events)
}

func loadDocuments(path string) ([]index.Document, error) {
	if path == "" {
		return nil, nil
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	content, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	var docs []index.Document
	if err := json.Unmarshal(content, &docs); err != nil {
		return nil, err
	}
	return docs, nil
}

func loadRedactions(path string) ([]index.RedactionEvent, error) {
	if path == "" {
		return nil, nil
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	content, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	var events []index.RedactionEvent
	if err := json.Unmarshal(content, &events); err != nil {
		return nil, err
	}
	return events, nil
}

func decodeJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("error writing response: %v", err)
	}
}

func encodeToStdout(payload any) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(payload)
}
