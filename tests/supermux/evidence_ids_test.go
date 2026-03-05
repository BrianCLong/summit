package supermux_test

import (
	"strings"
	"testing"
	"supermux/pkg/supermux"
)

func TestEvidenceIDs(t *testing.T) {
	run := supermux.NewRunID([]byte("seed1"))
	if !strings.HasPrefix(string(run), "SMX-RUN-") {
		t.Errorf("Expected prefix SMX-RUN-, got %s", run)
	}

	session := supermux.NewSessionID(run, "agent1")
	if !strings.HasPrefix(string(session), "SMX-SES-") {
		t.Errorf("Expected prefix SMX-SES-, got %s", session)
	}

	event := supermux.NextEventID()
	if !strings.HasPrefix(string(event), "SMX-EVT-") {
		t.Errorf("Expected prefix SMX-EVT-, got %s", event)
	}
}
