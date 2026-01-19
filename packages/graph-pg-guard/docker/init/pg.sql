CREATE SCHEMA IF NOT EXISTS accounts;

CREATE TABLE IF NOT EXISTS accounts.accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT,
  parent_id INTEGER REFERENCES accounts.accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS graph_guard_outbox (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL,
  pk JSONB NOT NULL,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION graph_guard_outbox_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_table_name TEXT := TG_TABLE_NAME;
  v_op TEXT := TG_OP;
  v_pk JSONB;
  v_before JSONB := NULL;
  v_after JSONB := NULL;
BEGIN
  IF (v_op = 'INSERT') THEN
    v_pk := jsonb_build_object('id', NEW.id);
    v_after := to_jsonb(NEW);
  ELSIF (v_op = 'UPDATE') THEN
    v_pk := jsonb_build_object('id', NEW.id);
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSIF (v_op = 'DELETE') THEN
    v_pk := jsonb_build_object('id', OLD.id);
    v_before := to_jsonb(OLD);
  END IF;

  INSERT INTO graph_guard_outbox (table_name, op, pk, before, after)
  VALUES (v_table_name, v_op, v_pk, v_before, v_after);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_outbox_trigger ON accounts.accounts;
CREATE TRIGGER accounts_outbox_trigger
AFTER INSERT OR UPDATE OR DELETE ON accounts.accounts
FOR EACH ROW EXECUTE FUNCTION graph_guard_outbox_trigger_fn();
