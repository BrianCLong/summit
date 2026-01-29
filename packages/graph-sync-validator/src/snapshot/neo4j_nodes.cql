CALL apoc.export.json.query(
  "
  MATCH (n)
  WITH n, apoc.map.removeKeys(properties(n), ['volatile_fields']) AS props
  RETURN n.id AS id, labels(n)[0] AS type, props AS payload, n.updated_at AS updated_at
  ORDER BY id
  ",
  null,
  {stream:true, jsonFormat:'JSON_LINES', useTypes:true}
) YIELD data RETURN data;
