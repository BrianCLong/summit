"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PGWriteSet = void 0;
const validatePlaybook_1 = require("../validate/validatePlaybook");
/**
 * PGWriteSet quarantines all PG writes.
 * They are analytic/defensive and must never write to the Reality Graph (RG).
 */
class PGWriteSet {
    operations = [];
    add(op) {
        this.operations.push(op);
    }
    commit() {
        const committedIds = [];
        const rejections = [];
        for (const op of this.operations) {
            if (op.type === 'create_playbook' || op.type === 'update_playbook') {
                const report = (0, validatePlaybook_1.validatePlaybook)(op.payload);
                if (report.ok) {
                    // Here, you would normally commit to the database (e.g., Neo4j/Postgres)
                    // Since this is PG, it strictly stays out of the RG schema.
                    committedIds.push(op.payload.id);
                }
                else {
                    rejections.push({ operation: op, report });
                }
            }
        }
        return {
            ok: rejections.length === 0,
            committedIds,
            rejections
        };
    }
}
exports.PGWriteSet = PGWriteSet;
