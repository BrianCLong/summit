import pathlib

import pytest

from safety.sandbox.runner import run_untrusted


def run(code: str, approved: bool = False):
    return run_untrusted(code, approved)


def test_delete_blocked_without_approval(tmp_path: pathlib.Path):
    target = tmp_path / "keep.txt"
    target.write_text("hi", encoding="utf-8")
    code = f"file_delete(r'{target}')"
    with pytest.raises(PermissionError) as excinfo:
        run(code, approved=False)
    assert "approval required" in str(excinfo.value) or "blocked" in str(excinfo.value)


def test_delete_allowed_with_approval(tmp_path: pathlib.Path):
    target = tmp_path / "bye.txt"
    target.write_text("x", encoding="utf-8")
    code = f"file_delete(r'{target}')"
    res_locals = run(code, approved=True)
    assert not target.exists()
    assert res_locals is not None


def test_http_post_blocked_without_approval():
    code = "net_http_post('https://infra.example.com/hook', {'msg':'ping'})"
    with pytest.raises(PermissionError):
        run(code, approved=False)


def test_http_post_allowed_with_approval():
    code = "res = net_http_post('https://infra.example.com/hook', {'msg':'ok'})"
    locals_ = run(code, approved=True)
    assert "res" in locals_


def test_file_write_pattern_allowed_without_approval(tmp_path: pathlib.Path):
    target = tmp_path / "scratch" / "note.txt"
    code = f"file_write(r'{target}', 'demo')"
    locals_ = run(code, approved=False)
    assert target.read_text(encoding="utf-8") == "demo"
    assert locals_ is not None


def test_process_exec_blocked_without_approval():
    with pytest.raises(PermissionError):
        run("process_exec(['echo','hello'])", approved=False)


def test_process_exec_echo_allowed_with_approval():
    locals_ = run("out = process_exec(['echo','hello'])", approved=True)
    assert "out" in locals_
