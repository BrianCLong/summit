import pytest
from graphrag.topology.router import Router, RegionRoute

def test_region_egress_denied_disallowed_class():
    router = Router()
    # Default config has us-central (public, restricted) and eu-west (public)

    # "restricted" in "eu-west" should fail
    with pytest.raises(ValueError, match="not allowed"):
        router.route("restricted", "eu-west")

def test_region_egress_allowed():
    router = Router()
    route = router.route("public", "eu-west")
    assert route.read_region == "eu-west"

def test_unknown_region_denied():
    router = Router()
    with pytest.raises(ValueError, match="Unknown region"):
        router.route("public", "mars")
