import pytest
from service import logic

def test_generate_checksum():
    content = "hello world"
    checksum = logic.generate_checksum(content)
    assert checksum == "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

def test_generate_merkle_root():
    items = ["a", "b", "c", "d"]
    merkle_root = logic.generate_merkle_root(items)
    assert merkle_root == "33376a3bd63e9993708a84ddfe6c28ae58b83505dd1fed711bd924ec5a6239f0"

def test_generate_merkle_root_single_item():
    items = ["a"]
    merkle_root = logic.generate_merkle_root(items)
    assert merkle_root == "022a6979e6dab7aa5ae4c3e5e45f7e977112a7e63593820dbec1ec738a24f93c"
