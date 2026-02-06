-- Deterministic digest for relational entities projection.
-- Requires: CREATE EXTENSION IF NOT EXISTS pgcrypto;
WITH row_hashes AS (
  SELECT encode(
    digest(
      concat_ws(
        '␟',
        coalesce(id::text, ''),
        coalesce(name, ''),
        coalesce(kind, ''),
        coalesce(
          to_char(
            updated_at AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          ''
        )
      )::bytea,
      'sha256'
    ),
    'hex'
  ) AS row_hex
  FROM public.entities
)
SELECT encode(
  digest(
    coalesce(string_agg(row_hex, '␞' ORDER BY row_hex), '')::bytea,
    'sha256'
  ),
  'hex'
) AS run_digest;
