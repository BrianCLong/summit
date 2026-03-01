-- one-time: channel & trigger for a table
CREATE OR REPLACE FUNCTION notify_lineage() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('lineage_channel',
    json_build_object(
      'event', TG_OP,
      'table', TG_TABLE_SCHEMA||'.'||TG_TABLE_NAME,
      'row', row_to_json(NEW)
    )::text
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lineage_after_insupd
AFTER INSERT OR UPDATE ON public.ingestion_jobs
FOR EACH ROW EXECUTE FUNCTION notify_lineage();
