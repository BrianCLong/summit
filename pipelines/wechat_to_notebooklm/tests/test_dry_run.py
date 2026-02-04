from pipelines.wechat_to_notebooklm.run import run


def test_dry_run_plan():
    url = "https://mp.weixin.qq.com/s/abc"
    p = run(url, "/tmp/out.md", "My Notebook", dry_run=True)
    assert p.canonical_url == url
    assert len(p.commands) == 2
    assert p.commands[0][1] == "create"
    assert p.commands[1][1] == "source"
