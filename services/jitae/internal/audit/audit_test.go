package audit

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestRecordAndVerifyChain(t *testing.T) {
	auditor, err := NewManagerFromSecret("chain-secret")
	require.NoError(t, err)

	ctx := context.Background()
	first, err := auditor.Record(ctx, "event.one", map[string]any{"requestorId": "alice"}, time.Unix(0, 0).UTC())
	require.NoError(t, err)
	second, err := auditor.Record(ctx, "event.two", map[string]any{"approverId": "bob"}, time.Unix(1, 0).UTC())
	require.NoError(t, err)

	require.Equal(t, "", first.PrevHash)
	require.Equal(t, first.EventHash, second.PrevHash)

	report, ok := auditor.VerifyChain(auditor.Events())
	require.True(t, ok, report.Failures)
	require.True(t, report.ChainOK)
	require.True(t, report.SignatureOK)
}

func TestTamperingFailsVerification(t *testing.T) {
	auditor, err := NewManagerFromSecret("tamper-secret")
	require.NoError(t, err)

	ctx := context.Background()
	_, err = auditor.Record(ctx, "event.one", map[string]any{"requestorId": "alice"}, time.Unix(0, 0).UTC())
	require.NoError(t, err)
	_, err = auditor.Record(ctx, "event.two", map[string]any{"approverId": "bob"}, time.Unix(1, 0).UTC())
	require.NoError(t, err)

	tampered := auditor.Events()
	tampered[0].Payload["requestorId"] = "eve"

	report, ok := auditor.VerifyChain(tampered)
	require.False(t, ok)
	require.False(t, report.SignatureOK)
	require.False(t, report.ChainOK)
}

func TestExportRedactsPIIAndPaginate(t *testing.T) {
	auditor, err := NewManagerFromSecret("export-secret")
	require.NoError(t, err)

	ctx := context.Background()
	_, err = auditor.Record(ctx, "event.one", map[string]any{"requestorId": "alice", "purpose": "diagnostics"}, time.Unix(0, 0).UTC())
	require.NoError(t, err)
	_, err = auditor.Record(ctx, "event.two", map[string]any{"approverId": "bob"}, time.Unix(1, 0).UTC())
	require.NoError(t, err)
	_, err = auditor.Record(ctx, "event.three", map[string]any{"approverId": "carol"}, time.Unix(2, 0).UTC())
	require.NoError(t, err)

	bundle, err := auditor.Export(1, 2)
	require.NoError(t, err)
	require.Equal(t, 3, bundle.Manifest.Total)
	require.Equal(t, 1, bundle.Manifest.From)
	require.Equal(t, 2, bundle.Manifest.To)
	require.Len(t, bundle.Records, 2)

	raw, err := json.Marshal(bundle)
	require.NoError(t, err)
	require.NotContains(t, string(raw), "alice")
	require.NotContains(t, string(raw), "purpose")
}

func TestVerifyWithPublicKey(t *testing.T) {
	auditor, err := NewManagerFromSecret("public-secret")
	require.NoError(t, err)

	ctx := context.Background()
	evt, err := auditor.Record(ctx, "event.one", nil, time.Unix(0, 0).UTC())
	require.NoError(t, err)

	ok, err := VerifyWithPublicKey(auditor.PublicKeyHex(), evt)
	require.NoError(t, err)
	require.True(t, ok)
}
