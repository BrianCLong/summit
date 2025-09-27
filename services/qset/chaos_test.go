package qset_test

import (
	"bytes"
	"encoding/json"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/summit/qset/internal/core"
	"github.com/summit/qset/internal/testutil"
)

type chaosRequest struct {
	core.Request
}

type chaosToken struct {
	core.Token
}

func TestChaosInvariants(t *testing.T) {
	harness := testutil.NewHarness(t)
	handler := harness.Server.Handler()
	rng := rand.New(rand.NewSource(1234))

	approvers := []string{"alice-key", "bob-key", "carol-key"}
	scopes := []string{"repo", "workflow", "org"}
	var requestIDs []string
	tokens := map[string]chaosToken{}

	for i := 0; i < 250; i++ {
		op := rng.Intn(5)
		switch op {
		case 0: // create
			body := map[string]any{
				"requester": randomRequester(rng),
				"tool":      "github",
				"purpose":   randomPurpose(rng),
				"scopes":    subset(rng, scopes),
			}
			payload, _ := json.Marshal(body)
			req := httptest.NewRequest(http.MethodPost, "/requests", bytes.NewReader(payload))
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code == http.StatusCreated || rec.Code == http.StatusOK {
				var resp chaosRequest
				_ = json.Unmarshal(rec.Body.Bytes(), &resp)
				if !contains(requestIDs, resp.ID) {
					requestIDs = append(requestIDs, resp.ID)
				}
			}
		case 1: // approve
			if len(requestIDs) == 0 {
				continue
			}
			id := requestIDs[rng.Intn(len(requestIDs))]
			key := approvers[rng.Intn(len(approvers))]
			req := httptest.NewRequest(http.MethodPost, "/requests/"+id+"/approve", nil)
			req.Header.Set("X-Approver-Key", key)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
		case 2: // deny
			if len(requestIDs) == 0 {
				continue
			}
			id := requestIDs[rng.Intn(len(requestIDs))]
			key := approvers[rng.Intn(len(approvers))]
			req := httptest.NewRequest(http.MethodPost, "/requests/"+id+"/deny", nil)
			req.Header.Set("X-Approver-Key", key)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
		case 3: // mint
			if len(requestIDs) == 0 {
				continue
			}
			id := requestIDs[rng.Intn(len(requestIDs))]
			key := approvers[rng.Intn(len(approvers))]
			req := httptest.NewRequest(http.MethodPost, "/requests/"+id+"/mint", nil)
			req.Header.Set("X-Approver-Key", key)
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code == http.StatusCreated || rec.Code == http.StatusOK {
				var tok chaosToken
				_ = json.Unmarshal(rec.Body.Bytes(), &tok)
				tokens[tok.ID] = tok
			}
		case 4: // attenuate
			if len(tokens) == 0 {
				continue
			}
			// Pick random token
			var parent chaosToken
			for _, tok := range tokens {
				parent = tok
				break
			}
			subsetScopes := subset(rng, parent.Scopes)
			if len(subsetScopes) == 0 {
				subsetScopes = []string{parent.Scopes[0]}
			}
			expires := parent.ExpiresAt.Add(time.Duration(-rng.Intn(3600)) * time.Second)
			body := map[string]any{
				"scopes":    subsetScopes,
				"expiresAt": expires.Format(time.RFC3339),
			}
			payload, _ := json.Marshal(body)
			req := httptest.NewRequest(http.MethodPost, "/tokens/"+parent.ID+"/attenuate", bytes.NewReader(payload))
			req.Header.Set("X-Approver-Key", approvers[rng.Intn(len(approvers))])
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, req)
			if rec.Code == http.StatusCreated {
				var child chaosToken
				_ = json.Unmarshal(rec.Body.Bytes(), &child)
				tokens[child.ID] = child
			}
		}
	}

	// Invariant checks
	for _, id := range requestIDs {
		req := httptest.NewRequest(http.MethodGet, "/requests/"+id, nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("failed to fetch request %s", id)
		}
		var resp chaosRequest
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		if resp.TokenID != "" && resp.Status != core.StatusApproved {
			t.Fatalf("token minted without approval for %s", id)
		}
		if resp.Status == core.StatusApproved && len(resp.Approvals) < harness.Cfg.Quorum {
			t.Fatalf("approval count below quorum for %s", id)
		}
	}

	for _, tok := range tokens {
		if tok.ParentID != "" {
			parent := tokens[tok.ParentID]
			if !core.IsSubset(parent.Scopes, tok.Scopes) {
				t.Fatalf("attenuation escalated scopes: %v -> %v", parent.Scopes, tok.Scopes)
			}
			if tok.ExpiresAt.After(parent.ExpiresAt) {
				t.Fatalf("attenuation extended expiry")
			}
		} else {
			toolScopes, _ := harness.Server.ToolScopes("github")
			if !core.IsSubset(toolScopes, tok.Scopes) {
				t.Fatalf("mint produced wider scopes than tool policy")
			}
		}
	}
}

func randomRequester(r *rand.Rand) string {
	return []string{"dev", "qa", "ops"}[r.Intn(3)]
}

func randomPurpose(r *rand.Rand) string {
	return []string{"deploy", "ci", "incident"}[r.Intn(3)]
}

func subset(r *rand.Rand, scopes []string) []string {
	if len(scopes) == 0 {
		return nil
	}
	var out []string
	for _, scope := range scopes {
		if r.Intn(2) == 1 {
			out = append(out, scope)
		}
	}
	if len(out) == 0 {
		out = append(out, scopes[r.Intn(len(scopes))])
	}
	return out
}

func contains(list []string, id string) bool {
	for _, v := range list {
		if v == id {
			return true
		}
	}
	return false
}
