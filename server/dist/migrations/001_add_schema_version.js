export async function up(db) {
    await db.query('CREATE TABLE IF NOT EXISTS schema_version (version TEXT PRIMARY KEY)');
}
export async function down(db) {
    await db.query('DROP TABLE IF EXISTS schema_version');
}
//# sourceMappingURL=001_add_schema_version.js.map