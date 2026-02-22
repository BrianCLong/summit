from graphrag.topology.router import Router

def test_router_readonly_mode():
    router = Router()
    route = router.route("public", "us-central")
    # Verify default behavior is local_read
    assert route.mode == "local_read"
    assert route.read_region == "us-central"
