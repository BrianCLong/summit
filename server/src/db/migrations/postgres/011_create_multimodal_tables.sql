-- Create types safely
DO $$ BEGIN
    CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'TEXT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE processing_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE confidence_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cross_modal_match_type AS ENUM ('VISUAL_SIMILARITY', 'SEMANTIC_SIMILARITY', 'TEMPORAL_CORRELATION', 'SPATIAL_PROXIMITY', 'ENTITY_MENTION', 'FACIAL_RECOGNITION', 'VOICE_RECOGNITION', 'OBJECT_DETECTION', 'OCR_CORRELATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS media_sources (
    id UUID PRIMARY KEY,
    uri TEXT NOT NULL,
    filename TEXT,
    media_type media_type NOT NULL,
    mime_type TEXT NOT NULL,
    filesize BIGINT,
    duration FLOAT,
    checksum TEXT,
    width INTEGER,
    height INTEGER,
    channels INTEGER,
    bit_rate INTEGER,
    frame_rate FLOAT,
    latitude FLOAT,
    longitude FLOAT,
    altitude FLOAT,
    gps_accuracy FLOAT,
    gps_timestamp TIMESTAMP WITH TIME ZONE,
    processing_status processing_status NOT NULL DEFAULT 'PENDING',
    extraction_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    uploaded_by TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS multimodal_entities (
    id UUID PRIMARY KEY,
    investigation_id UUID NOT NULL,
    media_source_id UUID REFERENCES media_sources(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    extracted_text TEXT,
    bbox_x FLOAT,
    bbox_y FLOAT,
    bbox_width FLOAT,
    bbox_height FLOAT,
    bbox_confidence FLOAT,
    temporal_start FLOAT,
    temporal_end FLOAT,
    temporal_confidence FLOAT,
    confidence FLOAT NOT NULL,
    confidence_level confidence_level,
    quality_score FLOAT,
    extraction_method TEXT,
    extraction_version TEXT,
    human_verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    text_embedding VECTOR(3072),
    visual_embedding VECTOR(1536),
    audio_embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cross_modal_matches (
    id UUID PRIMARY KEY,
    source_entity_id UUID REFERENCES multimodal_entities(id) ON DELETE CASCADE,
    target_entity_id UUID REFERENCES multimodal_entities(id) ON DELETE CASCADE,
    match_type cross_modal_match_type NOT NULL,
    confidence FLOAT NOT NULL,
    algorithm TEXT,
    explanation JSONB,
    similarity_score FLOAT,
    human_verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_multimodal_entities_investigation_id ON multimodal_entities(investigation_id);
CREATE INDEX IF NOT EXISTS idx_multimodal_entities_media_source_id ON multimodal_entities(media_source_id);
CREATE INDEX IF NOT EXISTS idx_cross_modal_matches_source ON cross_modal_matches(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_cross_modal_matches_target ON cross_modal_matches(target_entity_id);
