CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS http;

CREATE TABLE IF NOT EXISTS kv_settings (k text primary key, v text);

INSERT INTO kv_settings (k,v) VALUES
  ('EMBED_URL','http://model-runner:8080/embed'),
  ('EMBED_DIM','1536')
ON CONFLICT (k) DO NOTHING;

CREATE OR REPLACE FUNCTION _http_json(url text, payload jsonb)
RETURNS jsonb
LANGUAGE sql AS $$
  SELECT (http_post(url, 'application/json', payload::text)).content::jsonb
$$;

CREATE OR REPLACE FUNCTION query_embed(q text)
RETURNS vector
LANGUAGE plpgsql AS $$
DECLARE
  j jsonb;
  dim int := (SELECT v::int FROM kv_settings WHERE k='EMBED_DIM');
  emb text;
BEGIN
  IF q IS NULL OR length(q) = 0 THEN
    RAISE EXCEPTION 'empty query';
  END IF;

  j := _http_json((SELECT v FROM kv_settings WHERE k='EMBED_URL'),
                  jsonb_build_object('text', q));

  IF j ? 'embedding' AND jsonb_typeof(j->'embedding') = 'array' THEN
    emb := (j->'embedding')::text;
  ELSE
    RAISE EXCEPTION 'embedder response invalid: %', j;
  END IF;

  -- Optional: enforce dimension
  IF jsonb_array_length(j->'embedding') != dim THEN
    RAISE EXCEPTION 'bad embedding dimension: %', jsonb_array_length(j->'embedding');
  END IF;

  RETURN emb::vector;              -- pgvector will parse the array literal
EXCEPTION WHEN OTHERS THEN
  -- degrade: return a zero vector so query still executes
  RETURN ('[' || repeat('0,', dim-1) || '0]')::vector;
END;
$$;