from summit.enterprise.marketplace import AlgorithmStore, MarketItem

def test_marketplace_revshare():
    store = AlgorithmStore()
    item = MarketItem("algo_1", "dev_alice", "TRANSFORM", 100.0, "def run(): pass")

    store.publish(item)
    payout = store.purchase("algo_1", "corp_bob")

    assert payout["creator"] == 70.0
    assert payout["platform"] == 30.0
