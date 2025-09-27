package core

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/summit/jitae/internal/audit"
	"github.com/summit/jitae/internal/clock"
	notify "github.com/summit/jitae/internal/notifier"
)

func TestDualControlRequired(t *testing.T) {
	ctx := context.Background()
	manual := clock.NewManualClock(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	auditor, err := audit.NewManagerFromSecret("test-secret")
	require.NoError(t, err)

	svc := NewService(manual, auditor, notify.Noop{})

	tpl, err := svc.CreateTemplate(ctx, Template{
		Name:        "read-only",
		Description: "RO dataset access",
		Scopes:      []string{"dataset:alpha:read"},
		TTL:         time.Hour,
	})
	require.NoError(t, err)

	req, err := svc.CreateRequest(ctx, tpl.ID, "alice", "debug incident")
	require.NoError(t, err)
	require.Nil(t, req.Grant)

	_, err = svc.ApproveRequest(ctx, req.ID, "alice", "self approving")
	require.ErrorIs(t, err, ErrSelfApproval)

	approved, err := svc.ApproveRequest(ctx, req.ID, "bob", "looks good")
	require.NoError(t, err)
	require.Equal(t, StatusApproved, approved.Status)
	require.NotNil(t, approved.Grant)
	require.True(t, approved.Grant.Active)
	require.Equal(t, req.ID, approved.ID)
	require.WithinDuration(t, manual.Now().Add(time.Hour), approved.Grant.ExpiresAt, time.Second)
}

func TestExpiryRevokesDeterministically(t *testing.T) {
	ctx := context.Background()
	start := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	manual := clock.NewManualClock(start)
	auditor, err := audit.NewManagerFromSecret("expiry-secret")
	require.NoError(t, err)

	svc := NewService(manual, auditor, notify.Noop{})

	tpl, err := svc.CreateTemplate(ctx, Template{
		Name:        "short-lived",
		Description: "30s access",
		Scopes:      []string{"bucket:logs:read"},
		TTL:         30 * time.Second,
	})
	require.NoError(t, err)

	req, err := svc.CreateRequest(ctx, tpl.ID, "carol", "triage")
	require.NoError(t, err)

	approved, err := svc.ApproveRequest(ctx, req.ID, "dave", "")
	require.NoError(t, err)
	require.True(t, approved.Grant.Active)

	manual.Advance(31 * time.Second)

	expired, err := svc.ReconcileExpired(ctx, manual.Now())
	require.NoError(t, err)
	require.Len(t, expired, 1)
	require.Equal(t, StatusExpired, expired[0].Status)
	require.False(t, expired[0].Grant.Active)
	require.NotNil(t, expired[0].Grant.RevokedAt)
	require.WithinDuration(t, manual.Now(), *expired[0].Grant.RevokedAt, time.Second)

	// A subsequent reconciliation should be a no-op.
	again, err := svc.ReconcileExpired(ctx, manual.Now())
	require.NoError(t, err)
	require.Empty(t, again)
}

func TestAuditSignaturesRoundTrip(t *testing.T) {
	ctx := context.Background()
	manual := clock.NewManualClock(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	auditor, err := audit.NewManagerFromSecret("audit-secret")
	require.NoError(t, err)

	svc := NewService(manual, auditor, notify.Noop{})

	tpl, err := svc.CreateTemplate(ctx, Template{TTL: time.Minute, Name: "tmp"})
	require.NoError(t, err)

	req, err := svc.CreateRequest(ctx, tpl.ID, "eve", "analysis")
	require.NoError(t, err)

	_, err = svc.ApproveRequest(ctx, req.ID, "frank", "")
	require.NoError(t, err)

	manual.Advance(time.Minute)
	_, err = svc.ReconcileExpired(ctx, manual.Now())
	require.NoError(t, err)

	events := auditor.Events()
	require.NotEmpty(t, events)

	for _, evt := range events {
		// ensure JSON round-trip works without modifying the signature
		raw, err := json.Marshal(evt)
		require.NoError(t, err)
		var decoded audit.Event
		require.NoError(t, json.Unmarshal(raw, &decoded))
		require.Equal(t, evt.Signature, decoded.Signature)
		require.True(t, auditor.Verify(decoded))
	}
}
