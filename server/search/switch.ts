export function query(q, cfg) {
  return cfg.active === 'new' ? milvus.search(q) : pgvector.search(q);
}
