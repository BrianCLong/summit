package engine_test

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/summit/services/retentiond/internal/config"
	"github.com/summit/services/retentiond/internal/engine"
	"github.com/summit/services/retentiond/internal/receipts"
	"github.com/summit/services/retentiond/internal/storage"
)

func TestDryRunMatchesExecution(t *testing.T) {
	now := time.Unix(1_700_000_000, 0).UTC()
	cfg := config.Config{
		Interval: time.Hour,
		Receipts: config.ReceiptConfig{Directory: t.TempDir()},
		Policies: []config.Policy{
			{
				Name:      "daily-cutoff",
				RetainFor: 24 * time.Hour,
				Targets: []config.Target{
					{
						Type:   "s3",
						Bucket: "archive",
						Prefix: "logs/",
					},
					{
						Type:            "postgres",
						Table:           "events",
						TimestampColumn: "created_at",
						KeyColumns:      []string{"id"},
					},
				},
			},
		},
	}

	objectStore := newFakeObjectStore()
	objectStore.add("archive", storage.Object{Key: "logs/2023-01-01.json", UpdatedAt: now.Add(-48 * time.Hour).Unix()})
	objectStore.add("archive", storage.Object{Key: "logs/2023-01-02.json", UpdatedAt: now.Add(-23 * time.Hour).Unix()})

	database := newFakeDatabase()
	database.add(map[string]string{"id": "1"}, now.Add(-72*time.Hour).Unix())
	database.add(map[string]string{"id": "2"}, now.Add(-12*time.Hour).Unix())

	ctx := context.Background()

	dryEngine := &engine.Engine{
		ObjectStore: objectStore.clone(),
		Database:    database.clone(),
		Receipts:    receipts.NewFileWriter(cfg.Receipts.Directory),
		DryRun:      true,
	}

	dryCfg := cfg
	dryCfg.DryRun = true
	dryResults, err := dryEngine.Run(ctx, dryCfg, now)
	require.NoError(t, err)

	liveEngine := &engine.Engine{
		ObjectStore: objectStore.clone(),
		Database:    database.clone(),
		Receipts:    receipts.NewFileWriter(cfg.Receipts.Directory),
		DryRun:      false,
	}

	liveResults, err := liveEngine.Run(ctx, cfg, now)
	require.NoError(t, err)

	require.Equal(t, len(dryResults), len(liveResults))
	for i := range dryResults {
		require.Equal(t, dryResults[i].Policy, liveResults[i].Policy)
		require.Equal(t, dryResults[i].Targets, liveResults[i].Targets)
		require.True(t, liveResults[i].ReceiptIssued)
		require.NotEmpty(t, liveResults[i].ReceiptPath)
		_, err := os.Stat(liveResults[i].ReceiptPath)
		require.NoError(t, err)
	}

	// Verify the generated receipt.
	receiptData, err := os.ReadFile(liveResults[0].ReceiptPath)
	require.NoError(t, err)
	receipt, err := readReceipt(receiptData)
	require.NoError(t, err)
	ok, err := receipts.Verify(receipt)
	require.NoError(t, err)
	require.True(t, ok)

	// Ensure records were deleted only for executed run.
	liveObjectStore := liveEngine.ObjectStore.(*fakeObjectStore)
	require.Len(t, liveObjectStore.objects["archive"], 1)
	liveDatabase := liveEngine.Database.(*fakeDatabase)
	require.Len(t, liveDatabase.records, 1)
}

func readReceipt(data []byte) (receipts.Receipt, error) {
	var receipt receipts.Receipt
	err := json.Unmarshal(data, &receipt)
	return receipt, err
}

type fakeObjectStore struct {
	objects map[string][]storage.Object
}

func newFakeObjectStore() *fakeObjectStore {
	return &fakeObjectStore{objects: make(map[string][]storage.Object)}
}

func (f *fakeObjectStore) add(bucket string, obj storage.Object) {
	f.objects[bucket] = append(f.objects[bucket], obj)
}

func (f *fakeObjectStore) clone() *fakeObjectStore {
	clone := newFakeObjectStore()
	for bucket, objs := range f.objects {
		copied := make([]storage.Object, len(objs))
		copy(copied, objs)
		clone.objects[bucket] = copied
	}
	return clone
}

func (f *fakeObjectStore) ListExpired(_ context.Context, bucket, prefix string, cutoff int64) ([]storage.Object, error) {
	objs := f.objects[bucket]
	var expired []storage.Object
	for _, obj := range objs {
		if !strings.HasPrefix(obj.Key, prefix) {
			continue
		}
		if obj.UpdatedAt <= cutoff {
			expired = append(expired, obj)
		}
	}
	return expired, nil
}

func (f *fakeObjectStore) Delete(_ context.Context, bucket string, keys []string) error {
	remaining := make([]storage.Object, 0, len(f.objects[bucket]))
	keySet := make(map[string]struct{}, len(keys))
	for _, key := range keys {
		keySet[key] = struct{}{}
	}
	for _, obj := range f.objects[bucket] {
		if _, ok := keySet[obj.Key]; ok {
			continue
		}
		remaining = append(remaining, obj)
	}
	f.objects[bucket] = remaining
	return nil
}

func (f *fakeObjectStore) PlanLifecycle(context.Context, string, string, int) error { return nil }

type dbRecord struct {
	keys   map[string]string
	cutoff int64
}

type fakeDatabase struct {
	records []dbRecord
}

func newFakeDatabase() *fakeDatabase {
	return &fakeDatabase{}
}

func (f *fakeDatabase) add(keys map[string]string, cutoff int64) {
	f.records = append(f.records, dbRecord{keys: keys, cutoff: cutoff})
}

func (f *fakeDatabase) clone() *fakeDatabase {
	clone := newFakeDatabase()
	for _, record := range f.records {
		keys := make(map[string]string, len(record.keys))
		for k, v := range record.keys {
			keys[k] = v
		}
		clone.records = append(clone.records, dbRecord{keys: keys, cutoff: record.cutoff})
	}
	return clone
}

func (f *fakeDatabase) ListExpired(_ context.Context, _ string, _ string, _ string, _ []string, cutoff int64) ([]storage.Row, error) {
	rows := make([]storage.Row, 0)
	for _, record := range f.records {
		if record.cutoff <= cutoff {
			rows = append(rows, storage.Row{Keys: record.keys})
		}
	}
	return rows, nil
}

func (f *fakeDatabase) Delete(_ context.Context, _ string, rows []storage.Row, keyColumns []string) error {
	keySet := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		builder := strings.Builder{}
		for _, col := range keyColumns {
			builder.WriteString(row.Keys[col])
			builder.WriteByte('|')
		}
		keySet[builder.String()] = struct{}{}
	}
	remaining := make([]dbRecord, 0, len(f.records))
	for _, record := range f.records {
		builder := strings.Builder{}
		for _, col := range keyColumns {
			builder.WriteString(record.keys[col])
			builder.WriteByte('|')
		}
		if _, ok := keySet[builder.String()]; ok {
			continue
		}
		remaining = append(remaining, record)
	}
	f.records = remaining
	return nil
}

func (f *fakeDatabase) EnsureTTL(context.Context, string, string, string) error { return nil }
