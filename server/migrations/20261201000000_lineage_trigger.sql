-- Lineage Trigger for outbox_events
-- Captures events and notifies a listener for real-time lineage emission

CREATE OR REPLACE FUNCTION notify_lineage_event() RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload = jsonb_build_object(
    'id', NEW.id,
    'topic', NEW.topic,
    'aggregate_type', COALESCE(NEW.aggregate_type, 'UNKNOWN'),
    'aggregate_id', COALESCE(NEW.aggregate_id, '00000000-0000-0000-0000-000000000000'::uuid),
    'occurred_at', COALESCE(NEW.occurred_at, NEW.created_at, NOW())
  );
  PERFORM pg_notify('lineage_events', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lineage_event ON outbox_events;
CREATE TRIGGER trg_lineage_event
AFTER INSERT ON outbox_events
FOR EACH ROW EXECUTE FUNCTION notify_lineage_event();
