export interface ProvenanceRecord {
  action: string;
  actor: string;
  payload: any;
  at: string;
}

const records: ProvenanceRecord[] = [];

export class ProvenanceLedger {
  record(rec: ProvenanceRecord) {
    records.push(rec);
    return rec;
  }
  list() {
    return records;
  }
}
