CREATE TEXT INDEX idx_evidence_body IF NOT EXISTS FOR (n:Evidence) ON (n.body);
CREATE RANGE INDEX idx_event_timestamp IF NOT EXISTS FOR (n:Event) ON (n.timestamp);
CREATE RANGE INDEX idx_evidence_of_confidence IF NOT EXISTS FOR ()-[r:EVIDENCE_OF]-() ON (r.confidence);
