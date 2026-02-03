from services.index_store.snapshots.store import SnapshotStore, IndexSnapshot
def test_store():
    s = SnapshotStore()
    s.save_snapshot(IndexSnapshot(snapshot_id="s1", scope="o1", root_hash="r1"))
    assert s.get_snapshot("s1").root_hash == "r1"
