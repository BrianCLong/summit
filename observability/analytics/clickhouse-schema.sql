-- P34-35: Analytics Data Warehouse Schema
-- ClickHouse schema for event analytics and log analysis

-- Events table - raw event ingestion
CREATE TABLE IF NOT EXISTS summit.events
(
    event_id UUID DEFAULT generateUUIDv4(),
    event_type LowCardinality(String),
    event_source LowCardinality(String),
    event_time DateTime64(3) DEFAULT now64(3),
    received_time DateTime64(3) DEFAULT now64(3),

    -- User context
    user_id String,
    session_id String,
    user_agent String,

    -- Request context
    trace_id String,
    span_id String,
    request_id String,

    -- Event data
    properties String, -- JSON
    metadata String,   -- JSON

    -- Derived fields
    date Date DEFAULT toDate(event_time),
    hour UInt8 DEFAULT toHour(event_time),

    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_event_type event_type TYPE set(100) GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (event_type, event_time, event_id)
TTL date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Page views table
CREATE TABLE IF NOT EXISTS summit.page_views
(
    view_id UUID DEFAULT generateUUIDv4(),
    user_id String,
    session_id String,
    page_path String,
    page_title String,
    referrer String,
    view_time DateTime64(3),
    duration_ms UInt32,

    -- Device info
    device_type LowCardinality(String),
    browser LowCardinality(String),
    os LowCardinality(String),

    -- Location (privacy-safe)
    country LowCardinality(String),
    region LowCardinality(String),

    date Date DEFAULT toDate(view_time),

    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (page_path, view_time, view_id)
TTL date + INTERVAL 365 DAY;

-- Investigation analytics
CREATE TABLE IF NOT EXISTS summit.investigation_events
(
    event_id UUID DEFAULT generateUUIDv4(),
    investigation_id String,
    user_id String,
    event_type LowCardinality(String), -- created, entity_added, relationship_added, completed, etc.
    event_time DateTime64(3),

    -- Context
    entity_count UInt32,
    relationship_count UInt32,
    query_count UInt32,
    copilot_interactions UInt32,

    -- Performance
    duration_ms UInt32,

    date Date DEFAULT toDate(event_time),

    INDEX idx_investigation investigation_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_user user_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (investigation_id, event_time)
TTL date + INTERVAL 2 YEAR;

-- Search analytics
CREATE TABLE IF NOT EXISTS summit.search_events
(
    search_id UUID DEFAULT generateUUIDv4(),
    user_id String,
    session_id String,
    query_text String,
    query_hash String,
    search_type LowCardinality(String),
    search_time DateTime64(3),

    -- Results
    result_count UInt32,
    clicked_result_position UInt16,
    clicked_result_id String,

    -- Performance
    latency_ms UInt32,

    date Date DEFAULT toDate(search_time),

    INDEX idx_query_hash query_hash TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (search_type, search_time)
TTL date + INTERVAL 180 DAY;

-- Error tracking
CREATE TABLE IF NOT EXISTS summit.errors
(
    error_id UUID DEFAULT generateUUIDv4(),
    error_type LowCardinality(String),
    error_message String,
    error_stack String,
    error_time DateTime64(3),

    -- Context
    service LowCardinality(String),
    environment LowCardinality(String),
    version String,

    -- Request context
    trace_id String,
    user_id String,
    request_path String,
    request_method LowCardinality(String),

    -- Metadata
    tags Array(String),
    extra String, -- JSON

    date Date DEFAULT toDate(error_time),

    INDEX idx_error_type error_type TYPE set(100) GRANULARITY 4,
    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (error_type, error_time, error_id)
TTL date + INTERVAL 90 DAY;

-- Copilot usage analytics
CREATE TABLE IF NOT EXISTS summit.copilot_usage
(
    usage_id UUID DEFAULT generateUUIDv4(),
    user_id String,
    session_id String,
    action_type LowCardinality(String),
    request_time DateTime64(3),

    -- Model info
    model_id LowCardinality(String),
    model_version String,

    -- Token usage
    input_tokens UInt32,
    output_tokens UInt32,
    total_tokens UInt32,

    -- Performance
    latency_ms UInt32,

    -- Quality signals
    user_feedback LowCardinality(String), -- helpful, not_helpful, null
    was_accepted UInt8,

    date Date DEFAULT toDate(request_time),

    INDEX idx_user user_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (action_type, request_time)
TTL date + INTERVAL 365 DAY;

-- Materialized views for aggregations

-- Daily active users
CREATE MATERIALIZED VIEW IF NOT EXISTS summit.daily_active_users_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_type)
AS SELECT
    toDate(event_time) AS date,
    'all' AS user_type,
    uniqExact(user_id) AS unique_users,
    count() AS total_events
FROM summit.events
WHERE user_id != ''
GROUP BY date, user_type;

-- Hourly event counts
CREATE MATERIALIZED VIEW IF NOT EXISTS summit.hourly_events_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, event_type)
AS SELECT
    toDate(event_time) AS date,
    toHour(event_time) AS hour,
    event_type,
    count() AS event_count
FROM summit.events
GROUP BY date, hour, event_type;

-- Error rate by service
CREATE MATERIALIZED VIEW IF NOT EXISTS summit.error_rate_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, service, error_type)
AS SELECT
    toDate(error_time) AS date,
    toHour(error_time) AS hour,
    service,
    error_type,
    count() AS error_count
FROM summit.errors
GROUP BY date, hour, service, error_type;

-- Search success rate
CREATE MATERIALIZED VIEW IF NOT EXISTS summit.search_success_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, search_type)
AS SELECT
    toDate(search_time) AS date,
    search_type,
    count() AS total_searches,
    countIf(result_count > 0) AS successful_searches,
    countIf(clicked_result_id != '') AS clicked_searches,
    avg(latency_ms) AS avg_latency_ms
FROM summit.search_events
GROUP BY date, search_type;
