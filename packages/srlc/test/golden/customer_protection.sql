-- SRL-C canonical helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION srlc_assert_format(value text, format text)
RETURNS void AS $$
BEGIN
  IF value IS NULL THEN
    RETURN;
  END IF;
  IF format = 'ssn' AND value !~ '^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$' THEN
    RAISE EXCEPTION 'SRLC format violation for SSN: %', value;
  ELSIF format = 'iban' AND value !~ '^[A-Z0-9]{15,34}$' THEN
    RAISE EXCEPTION 'SRLC format violation for IBAN: %', value;
  ELSIF format = 'phone' AND value !~ '^\+?[0-9]{10,15}$' THEN
    RAISE EXCEPTION 'SRLC format violation for phone number: %', value;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION srlc_mask(value text, keep integer, mask_char text, format text)
RETURNS text AS $$
DECLARE
  clean text := COALESCE(value, '');
  idx integer;
  visible integer := 0;
  current text;
  result text := '';
BEGIN
  PERFORM srlc_assert_format(value, format);
  IF keep < 0 THEN
    RAISE EXCEPTION 'SRLC mask keep must be non-negative';
  END IF;
  IF keep = 0 THEN
    RETURN regexp_replace(clean, '[A-Za-z0-9]', mask_char, 'g');
  END IF;
  FOR idx IN REVERSE 1..length(clean) LOOP
    current := substr(clean, idx, 1);
    IF current ~ '[A-Za-z0-9]' THEN
      IF visible < keep THEN
        result := current || result;
        visible := visible + 1;
      ELSE
        result := mask_char || result;
      END IF;
    ELSE
      result := current || result;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION srlc_hash(value text, algorithm text, salt_scope text)
RETURNS text AS $$
DECLARE
  salt text := CASE salt_scope WHEN 'global' THEN 'SRLC_GLOBAL' ELSE 'SRLC_SESSION' END;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(digest(value || salt, algorithm), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION srlc_tokenize(value text, namespace text, preserve_format boolean, format text)
RETURNS text AS $$
DECLARE
  token text;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM srlc_assert_format(value, format);
  token := encode(digest(namespace || ':' || value, 'sha256'), 'hex');
  IF preserve_format THEN
    RETURN substring(token FROM 1 FOR length(value));
  END IF;
  RETURN token;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION srlc_generalize(value text, granularity text)
RETURNS text AS $$
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  IF granularity = 'none' THEN
    RETURN value;
  END IF;
  RETURN granularity || '::' || value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- SRL-C Policy customer_protection (scope=session)

SELECT
  srlc_hash(srlc_mask(payload #>> '{customer,ssn}', 4, '#', 'ssn'), 'sha256', 'session') AS "customer_ssn" -- customer.ssn:mask(format=ssn,keep=4,char=#) |> hash(format=ssn,algorithm=sha256,salt=session),
  srlc_tokenize(payload #>> '{account,iban}', 'payments', true, 'iban') AS "account_iban" -- account.iban:tokenize(format=iban,namespace=payments,preserveFormat=true),
  srlc_generalize(srlc_mask(payload #>> '{contact,phone}', 4, '#', 'phone'), 'region') AS "contact_phone" -- contact.phone:mask(format=phone,keep=4,char=#) |> generalize(format=phone,granularity=region)
FROM source_stream;