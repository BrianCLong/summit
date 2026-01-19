function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function validateSchemaSubset(value, schema, atPath = "$") {
  assert(schema && typeof schema === "object", `schema invalid at ${atPath}`);

  if (schema.enum) {
    assert(Array.isArray(schema.enum), `schema.enum must be array at ${atPath}`);
    const ok = schema.enum.some((x) => deepEqual(value, x));
    assert(ok, `value not in enum at ${atPath}`);
    return;
  }

  if (schema.type) {
    switch (schema.type) {
      case "object":
        assert(isPlainObject(value), `expected object at ${atPath}`);
        if (schema.required) {
          assert(Array.isArray(schema.required), `required must be array at ${atPath}`);
          for (const k of schema.required) {
            assert(Object.prototype.hasOwnProperty.call(value, k), `missing required key "${k}" at ${atPath}`);
          }
        }
        if (schema.properties) {
          assert(isPlainObject(schema.properties), `properties must be object at ${atPath}`);
          for (const [k, sub] of Object.entries(schema.properties)) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              validateSchemaSubset(value[k], sub, `${atPath}.${k}`);
            }
          }
        }
        return;

      case "array":
        assert(Array.isArray(value), `expected array at ${atPath}`);
        if (schema.items) {
          for (let i = 0; i < value.length; i++) {
            validateSchemaSubset(value[i], schema.items, `${atPath}[${i}]`);
          }
        }
        return;

      case "string":
        assert(typeof value === "string", `expected string at ${atPath}`);
        return;

      case "number":
        assert(typeof value === "number" && Number.isFinite(value), `expected finite number at ${atPath}`);
        return;

      case "integer":
        assert(Number.isInteger(value), `expected integer at ${atPath}`);
        return;

      case "boolean":
        assert(typeof value === "boolean", `expected boolean at ${atPath}`);
        return;

      case "null":
        assert(value === null, `expected null at ${atPath}`);
        return;

      default:
        throw new Error(`unsupported schema.type "${schema.type}" at ${atPath}`);
    }
  }

  // If no type/enum specified, accept any.
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === "object") {
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i++) if (ak[i] !== bk[i]) return false;
    for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}
