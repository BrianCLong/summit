import pytest

from ingest.wechat.validate import UrlRejected, canonicalize_and_validate


def test_allows_mp_weixin():
    c = canonicalize_and_validate("https://mp.weixin.qq.com/s/abc123")
    assert c.host == "mp.weixin.qq.com"


@pytest.mark.parametrize(
    "u",
    [
        "https://example.com/x",
        "file:///etc/passwd",
        "ftp://mp.weixin.qq.com/s/abc",
    ],
)
def test_blocks_other_schemes_or_hosts(u):
    with pytest.raises(UrlRejected):
        canonicalize_and_validate(u)
