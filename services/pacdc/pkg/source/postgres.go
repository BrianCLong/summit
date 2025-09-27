package source

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pglogrepl"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgproto3"
	_ "github.com/lib/pq"

	"github.com/summit/pacdc/pkg/config"
	"github.com/summit/pacdc/pkg/replicator"
)

// PostgresSource implements Source using PostgreSQL snapshot + logical replication.
type PostgresSource struct {
	cfg config.SourceConfig
}

// NewPostgresSource constructs a PostgresSource from config.
func NewPostgresSource(cfg config.SourceConfig) *PostgresSource {
	return &PostgresSource{cfg: cfg}
}

// Snapshot retrieves a full snapshot for a stream.
func (p *PostgresSource) Snapshot(ctx context.Context, stream config.StreamConfig) (replicator.SnapshotBatch, error) {
	db, err := sql.Open("postgres", p.cfg.URL)
	if err != nil {
		return replicator.SnapshotBatch{}, err
	}
	defer db.Close()

	query := fmt.Sprintf("SELECT * FROM %s.%s", pqQuoteIdentifier(stream.Schema), pqQuoteIdentifier(stream.Table))
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return replicator.SnapshotBatch{}, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return replicator.SnapshotBatch{}, err
	}
	results := make([]map[string]any, 0)
	for rows.Next() {
		values := make([]any, len(columns))
		pointers := make([]any, len(columns))
		for i := range values {
			pointers[i] = &values[i]
		}
		if err := rows.Scan(pointers...); err != nil {
			return replicator.SnapshotBatch{}, err
		}
		row := make(map[string]any, len(columns))
		for i, col := range columns {
			row[col] = deref(values[i])
		}
		results = append(results, row)
	}
	if err := rows.Err(); err != nil {
		return replicator.SnapshotBatch{}, err
	}
	return replicator.SnapshotBatch{Rows: results, LSN: ""}, nil
}

// Changes reads logical replication messages and converts them to ChangeEvents.
func (p *PostgresSource) Changes(ctx context.Context, stream config.StreamConfig, fromLSN string) ([]replicator.ChangeEvent, string, error) {
	conn, err := pgconn.Connect(ctx, p.cfg.URL)
	if err != nil {
		return nil, "", err
	}
	defer conn.Close(ctx)

	startLSN := pglogrepl.LSN(0)
	if fromLSN != "" {
		parsed, err := pglogrepl.ParseLSN(fromLSN)
		if err != nil {
			return nil, "", err
		}
		startLSN = parsed
	}

	opts := pglogrepl.StartReplicationOptions{
		PluginArgs: []string{
			"proto_version '1'",
			fmt.Sprintf("publication_names '%s'", p.cfg.Publication),
		},
	}
	if err := pglogrepl.StartReplication(ctx, conn, p.cfg.SlotName, startLSN, opts); err != nil {
		return nil, "", err
	}

	relations := map[uint32]*pglogrepl.RelationMessage{}
	events := make([]replicator.ChangeEvent, 0)
	lastLSN := startLSN

	for {
		msg, err := conn.ReceiveMessage(ctx)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
				break
			}
			return nil, "", err
		}
		switch msg := msg.(type) {
		case *pgproto3.CopyData:
			switch msg.Data[0] {
			case pglogrepl.PrimaryKeepaliveMessageByteID:
				keepalive, err := pglogrepl.ParsePrimaryKeepaliveMessage(msg.Data[1:])
				if err != nil {
					return nil, "", err
				}
				lastLSN = keepalive.ServerWALEnd
				if keepalive.ReplyRequested {
					status := pglogrepl.StandbyStatusUpdate{WALWritePosition: lastLSN}
					if err := pglogrepl.SendStandbyStatusUpdate(ctx, conn, status); err != nil {
						return nil, "", err
					}
				}
			case pglogrepl.XLogDataByteID:
				xld, err := pglogrepl.ParseXLogData(msg.Data[1:])
				if err != nil {
					return nil, "", err
				}
				lastLSN = xld.ServerWALEnd
				logical, err := pglogrepl.Parse(xld.WALData)
				if err != nil {
					return nil, "", err
				}
				switch typed := logical.(type) {
				case *pglogrepl.RelationMessage:
					relations[typed.RelationID] = typed
				case *pglogrepl.InsertMessage:
					rel := relations[typed.RelationID]
					row := tupleToMap(rel, typed.Tuple)
					events = append(events, replicator.ChangeEvent{
						Stream:    stream.Name,
						Type:      replicator.ChangeTypeInsert,
						NewValues: row,
						LSN:       lastLSN.String(),
					})
				case *pglogrepl.UpdateMessage:
					rel := relations[typed.RelationID]
					newRow := tupleToMap(rel, typed.NewTuple)
					oldRow := tupleToMap(rel, typed.OldTuple)
					events = append(events, replicator.ChangeEvent{
						Stream:    stream.Name,
						Type:      replicator.ChangeTypeUpdate,
						NewValues: newRow,
						OldValues: oldRow,
						LSN:       lastLSN.String(),
					})
				case *pglogrepl.DeleteMessage:
					rel := relations[typed.RelationID]
					row := tupleToMap(rel, typed.OldTuple)
					events = append(events, replicator.ChangeEvent{
						Stream:    stream.Name,
						Type:      replicator.ChangeTypeDelete,
						OldValues: row,
						LSN:       lastLSN.String(),
					})
				}
			}
		}
	}
	return events, lastLSN.String(), nil
}

func deref(value any) any {
	switch v := value.(type) {
	case *string:
		if v == nil {
			return nil
		}
		return *v
	case *int64:
		if v == nil {
			return nil
		}
		return *v
	case *bool:
		if v == nil {
			return nil
		}
		return *v
	case *[]byte:
		if v == nil {
			return nil
		}
		return string(*v)
	default:
		return v
	}
}

func tupleToMap(rel *pglogrepl.RelationMessage, tuple *pglogrepl.TupleData) map[string]any {
	if tuple == nil || rel == nil {
		return nil
	}
	row := make(map[string]any, len(rel.Columns))
	for i, col := range tuple.Columns {
		if i >= len(rel.Columns) {
			continue
		}
		name := rel.Columns[i].Name
		switch col.DataType {
		case pglogrepl.TupleDataTypeNull:
			row[name] = nil
		case pglogrepl.TupleDataTypeToast:
			// unchanged toast values are ignored
		case pglogrepl.TupleDataTypeBinary:
			row[name] = append([]byte(nil), col.Data...)
		case pglogrepl.TupleDataTypeText:
			fallthrough
		default:
			row[name] = string(col.Data)
		}
	}
	return row
}

func pqQuoteIdentifier(identifier string) string {
	return fmt.Sprintf("\"%s\"", strings.ReplaceAll(identifier, "\"", "\"\""))
}
