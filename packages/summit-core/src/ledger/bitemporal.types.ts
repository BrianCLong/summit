export type IsoDateTime = string; // enforce via schema/validator in write firewall

/**
 * valid_time: the time interval the claim is asserted true "in the world"
 * tx_time: when Summit recorded the statement (append-only ledger time)
 */
export type Bitemporal = {
  valid_time: { start: IsoDateTime; end?: IsoDateTime | null };
  tx_time: { at: IsoDateTime };
};

/**
 * Stable ids are crucial for replay/diff:
 * - artifact_id: id for raw artifact (doc/post/sensor record)
 * - claim_id: id for a specific claim statement
 * - entity_id: id for entity nodes
 *
 * These SHOULD be stable across re-ingestions.
 */
export type StableId = string;

/**
 * Deterministic content hash (sha256 hex recommended).
 */
export type Sha256 = string;

export type Confidence = {
  score: number; // 0..1
  method?: string; // e.g. "bayes", "heuristic", "rm"
  rationale?: string; // short string; full chain comes from Explain()
};
