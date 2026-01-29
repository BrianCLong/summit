CALL apoc.export.json.query(
  "
  MATCH (a)-[r]->(b)
  WITH a,b,r, apoc.map.removeKeys(properties(r), ['volatile_fields']) AS props
  RETURN a.id AS src, type(r) AS rel, b.id AS dst, props AS payload, r.updated_at AS updated_at
  ORDER BY src, rel, dst
  ",
  null,
  {stream:true, jsonFormat:'JSON_LINES', useTypes:true}
) YIELD data RETURN data;
