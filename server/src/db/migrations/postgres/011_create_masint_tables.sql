-- Create table for storing raw MASINT signals
CREATE TABLE IF NOT EXISTS masint_signals (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  location GEOMETRY(Point, 4326) -- Optional: Requires PostGIS, otherwise use JSONB or separate lat/lon columns
);

-- Fallback if PostGIS is not available (using JSONB for location in 'data' is already there, but let's index it if possible)
-- For this MVP, we will rely on the JSONB 'data' column which contains location info.
-- We can create a GIN index on the data column for efficient querying.

CREATE INDEX IF NOT EXISTS idx_masint_signals_data ON masint_signals USING gin (data);
CREATE INDEX IF NOT EXISTS idx_masint_signals_type ON masint_signals(type);
CREATE INDEX IF NOT EXISTS idx_masint_signals_timestamp ON masint_signals(timestamp);

-- Create table for storing analysis results
CREATE TABLE IF NOT EXISTS masint_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES masint_signals(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_masint_analysis_signal_id ON masint_analysis(signal_id);
