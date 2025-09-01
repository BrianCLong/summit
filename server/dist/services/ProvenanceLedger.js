const records = [];
export class ProvenanceLedger {
    record(rec) {
        records.push(rec);
        return rec;
    }
    list() {
        return records;
    }
}
//# sourceMappingURL=ProvenanceLedger.js.map