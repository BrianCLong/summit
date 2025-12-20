-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create geo_locations table
CREATE TABLE IF NOT EXISTS geo_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for geo_locations
CREATE INDEX IF NOT EXISTS idx_geo_locations_location ON geo_locations USING GIST (location);

-- Create geo_routes table
CREATE TABLE IF NOT EXISTS geo_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  path GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for geo_routes
CREATE INDEX IF NOT EXISTS idx_geo_routes_path ON geo_routes USING GIST (path);

-- Create geo_geofences table
CREATE TABLE IF NOT EXISTS geo_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  area GEOGRAPHY(POLYGON, 4326) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for geo_geofences
CREATE INDEX IF NOT EXISTS idx_geo_geofences_area ON geo_geofences USING GIST (area);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_geo_locations_updated_at
    BEFORE UPDATE ON geo_locations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_geo_routes_updated_at
    BEFORE UPDATE ON geo_routes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_geo_geofences_updated_at
    BEFORE UPDATE ON geo_geofences
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
