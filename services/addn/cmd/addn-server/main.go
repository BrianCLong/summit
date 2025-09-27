package main

import (
	"encoding/base64"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/summit/addn/internal/cache"
	"github.com/summit/addn/pkg/addn"
)

type datasetUpload struct {
	Dataset       string           `json:"dataset"`
	Version       string           `json:"version"`
	PolicyTags    []string         `json:"policyTags"`
	ResidencyPins []string         `json:"residencyPins"`
	Artifacts     []artifactUpload `json:"artifacts"`
	IssuedAt      *time.Time       `json:"issuedAt,omitempty"`
}

type artifactUpload struct {
	Name       string   `json:"name"`
	Content    string   `json:"content"`
	PolicyTags []string `json:"policyTags"`
	Residency  string   `json:"residency"`
}

type revocationRequest struct {
	Type   string `json:"type"`
	Digest string `json:"digest"`
	Reason string `json:"reason"`
}

func main() {
	addr := flag.String("addr", ":8080", "address to bind")
	ttl := flag.Duration("ttl", 10*time.Minute, "manifest ttl duration")
	swr := flag.Duration("swr", 5*time.Minute, "stale-while-revalidate window")
	flag.Parse()

	edge, err := cache.NewEdgeCache(*ttl, *swr)
	if err != nil {
		log.Fatalf("failed to initialize cache: %v", err)
	}

	r := mux.NewRouter()
	r.HandleFunc("/datasets", handleUpload(edge)).Methods(http.MethodPost)
	r.HandleFunc("/datasets/{dataset}/{version}/manifest", handleManifest(edge)).Methods(http.MethodGet)
	r.HandleFunc("/datasets/{dataset}/{version}/artifact/{artifact}", handleArtifact(edge)).Methods(http.MethodGet)
	r.HandleFunc("/revocations", handleRevocations(edge)).Methods(http.MethodGet)
	r.HandleFunc("/revocations", handleRevoke(edge)).Methods(http.MethodPost)

	log.Printf("addn edge cache listening on %s", *addr)
	if err := http.ListenAndServe(*addr, r); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}

func handleUpload(edge *cache.EdgeCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req datasetUpload
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if len(req.Artifacts) == 0 {
			http.Error(w, "artifacts required", http.StatusBadRequest)
			return
		}

		inputs := make([]cache.ArtifactInput, 0, len(req.Artifacts))
		for _, art := range req.Artifacts {
			data, err := base64.StdEncoding.DecodeString(art.Content)
			if err != nil {
				http.Error(w, "invalid artifact content encoding", http.StatusBadRequest)
				return
			}
			inputs = append(inputs, cache.ArtifactInput{
				Name:       art.Name,
				Content:    data,
				PolicyTags: art.PolicyTags,
				Residency:  art.Residency,
			})
		}

		now := time.Now().UTC()
		if req.IssuedAt != nil {
			now = req.IssuedAt.UTC()
		}

		manifest, err := edge.AddDataset(cache.DatasetInput{
			Dataset:       req.Dataset,
			Version:       req.Version,
			PolicyTags:    req.PolicyTags,
			ResidencyPins: req.ResidencyPins,
			Artifacts:     inputs,
		}, now)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		writeJSON(w, http.StatusCreated, addn.ManifestResponse{
			Manifest:    manifest,
			Status:      "fresh",
			Revocations: edge.RevocationList(),
		})
	}
}

func handleManifest(edge *cache.EdgeCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		region := r.URL.Query().Get("region")
		if region == "" {
			http.Error(w, "region query parameter required", http.StatusBadRequest)
			return
		}

		resp, err := edge.GetManifest(vars["dataset"], vars["version"], time.Now().UTC())
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := addn.VerifyResidency(resp.Manifest, region); err != nil {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}

		writeJSON(w, http.StatusOK, resp)
	}
}

func handleArtifact(edge *cache.EdgeCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		region := r.URL.Query().Get("region")
		if region == "" {
			http.Error(w, "region query parameter required", http.StatusBadRequest)
			return
		}

		artifact, err := edge.GetArtifact(vars["dataset"], vars["version"], vars["artifact"], region)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("X-Artifact-Digest", artifact.Digest)
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write(artifact.Content); err != nil {
			log.Printf("error writing artifact: %v", err)
		}
	}
}

func handleRevocations(edge *cache.EdgeCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, edge.RevocationList())
	}
}

func handleRevoke(edge *cache.EdgeCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req revocationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		now := time.Now()
		switch req.Type {
		case "manifest":
			edge.RevokeManifest(req.Digest, req.Reason, now)
		case "artifact":
			edge.RevokeArtifact(req.Digest, req.Reason, now)
		default:
			http.Error(w, "type must be manifest or artifact", http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusOK, edge.RevocationList())
	}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("failed to write json: %v", err)
	}
}
