export async function up(db) {
    await db.query("INSERT INTO schema_version (version) VALUES ('1.0.0') ON CONFLICT (version) DO NOTHING");
}
export async function down(db) {
    await db.query("DELETE FROM schema_version WHERE version='1.0.0'");
}
//# sourceMappingURL=1.0.0_migration.js.map