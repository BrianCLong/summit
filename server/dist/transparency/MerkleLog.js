import crypto from 'crypto';
export class MerkleLog {
    entries = [];
    append(entry) {
        this.entries.push(entry);
    }
    size() {
        return this.entries.length;
    }
    root() {
        return crypto
            .createHash('sha256')
            .update(this.entries.join(''))
            .digest('hex');
    }
}
//# sourceMappingURL=MerkleLog.js.map