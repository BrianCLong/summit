package config

// Config describes replication configuration for PACDC.
type Config struct {
	Source   SourceConfig            `json:"source"`
	Streams  []StreamConfig          `json:"streams"`
	Policies map[string]PolicyConfig `json:"policies"`
	Targets  []TargetConfig          `json:"targets"`
}

// SourceConfig holds PostgreSQL CDC settings.
type SourceConfig struct {
	URL          string `json:"url"`
	SlotName     string `json:"slotName"`
	Publication  string `json:"publication"`
	SnapshotMode string `json:"snapshotMode"`
}

// StreamConfig configures a PostgreSQL stream/table replication.
type StreamConfig struct {
	Name       string            `json:"name"`
	Schema     string            `json:"schema"`
	Table      string            `json:"table"`
	PrimaryKey []string          `json:"primaryKey"`
	Tags       map[string]string `json:"tags"`
	Policy     string            `json:"policy"`
}

// PolicyConfig defines per-stream policy controls.
type PolicyConfig struct {
	Columns       []ColumnPolicy     `json:"columns"`
	RowFilters    []RowFilter        `json:"rowFilters"`
	Jurisdictions []JurisdictionRule `json:"jurisdictions"`
}

// ColumnPolicy defines a column action: allow, deny, or redact.
type ColumnPolicy struct {
	Column string `json:"column"`
	Action string `json:"action"`
}

// RowFilter limits rows according to simple operators.
type RowFilter struct {
	Column   string      `json:"column"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// JurisdictionRule filters rows by jurisdiction enumerations.
type JurisdictionRule struct {
	Column  string   `json:"column"`
	Allowed []string `json:"allowed"`
}

// TargetConfig configures a replication target.
type TargetConfig struct {
	Type     string          `json:"type"`
	S3       *S3Config       `json:"s3,omitempty"`
	BigQuery *BigQueryConfig `json:"bigquery,omitempty"`
}

// S3Config describes the S3 target configuration.
type S3Config struct {
	Bucket   string `json:"bucket"`
	Prefix   string `json:"prefix"`
	Region   string `json:"region"`
	Endpoint string `json:"endpoint"`
}

// BigQueryConfig describes the BigQuery target configuration.
type BigQueryConfig struct {
	ProjectID string `json:"projectId"`
	Dataset   string `json:"dataset"`
	Table     string `json:"table"`
}
