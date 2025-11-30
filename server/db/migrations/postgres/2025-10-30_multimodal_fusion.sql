-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Media Sources Table
CREATE TABLE IF NOT EXISTS media_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uri TEXT NOT NULL,
  filename TEXT,
  media_type TEXT NOT NULL,
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
  gps_timestamp TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'PENDING',
  extraction_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multimodal Entities Table with pgvector columns
CREATE TABLE IF NOT EXISTS multimodal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investigation_id UUID NOT NULL, -- Logical grouping
  media_source_id UUID REFERENCES media_sources(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  extracted_text TEXT,

  -- Bounding Box (Visual)
  bbox_x FLOAT,
  bbox_y FLOAT,
  bbox_width FLOAT,
  bbox_height FLOAT,
  bbox_confidence FLOAT,

  -- Temporal (Audio/Video)
  temporal_start FLOAT,
  temporal_end FLOAT,
  temporal_confidence FLOAT,

  confidence FLOAT DEFAULT 0.0,
  confidence_level TEXT,
  quality_score FLOAT,
  extraction_method TEXT,
  extraction_version TEXT,

  human_verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- Vector Embeddings (3072 dims for text-embedding-3-large)
  text_embedding vector(3072),
  visual_embedding vector(3072),
  audio_embedding vector(3072),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for vector search (HNSW is faster than IVFFlat for high dims)
CREATE INDEX IF NOT EXISTS multimodal_entities_text_embedding_idx ON multimodal_entities USING hnsw (text_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS multimodal_entities_visual_embedding_idx ON multimodal_entities USING hnsw (visual_embedding vector_cosine_ops);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_multimodal_entities_investigation_id ON multimodal_entities(investigation_id);
CREATE INDEX IF NOT EXISTS idx_multimodal_entities_media_source_id ON multimodal_entities(media_source_id);
CREATE INDEX IF NOT EXISTS idx_multimodal_entities_entity_type ON multimodal_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_media_sources_processing_status ON media_sources(processing_status);
