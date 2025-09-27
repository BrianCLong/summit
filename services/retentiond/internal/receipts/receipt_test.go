package receipts_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/summit/services/retentiond/internal/receipts"
)

func TestReceiptVerification(t *testing.T) {
	builder := receipts.NewBuilder("example")
	builder.Add("s3", "bucket/key1")
	builder.Add("postgres", "events(id=1)")

	receipt, err := builder.Build()
	require.NoError(t, err)

	ok, err := receipts.Verify(receipt)
	require.NoError(t, err)
	require.True(t, ok)

	// Tamper with receipt
	receipt.Items[0].Identifier = "bucket/key2"
	ok, err = receipts.Verify(receipt)
	require.Error(t, err)
	require.False(t, ok)
}

func TestReceiptJSONRoundTrip(t *testing.T) {
	builder := receipts.NewBuilder("roundtrip")
	builder.Add("s3", "bucket/key1")
	receipt, err := builder.Build()
	require.NoError(t, err)

	raw, err := json.Marshal(receipt)
	require.NoError(t, err)

	var decoded receipts.Receipt
	require.NoError(t, json.Unmarshal(raw, &decoded))

	ok, err := receipts.Verify(decoded)
	require.NoError(t, err)
	require.True(t, ok)
}
