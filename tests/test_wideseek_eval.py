import pytest
from summit.eval.wideseek import parse_markdown_table, evaluate_table

def test_parse_markdown_table():
    md = """
| Country | Capital |
| --- | --- |
| France | Paris |
| Spain | Madrid |
    """
    rows = parse_markdown_table(md)
    assert len(rows) == 2
    assert rows[0]["Country"] == "France"
    assert rows[0]["Capital"] == "Paris"

def test_evaluate_table_perfect():
    pred = [
        {"Country": "France", "Capital": "Paris"},
        {"Country": "Spain", "Capital": "Madrid"}
    ]
    gold = [
        {"Country": "France", "Capital": "Paris"},
        {"Country": "Spain", "Capital": "Madrid"}
    ]
    metrics = evaluate_table(pred, gold)
    assert metrics["item_f1"] == 1.0
    assert metrics["row_f1"] == 1.0

def test_evaluate_table_partial():
    pred = [
        {"Country": "France", "Capital": "Paris"},
        {"Country": "Spain", "Capital": "Barcelona"} # Wrong capital
    ]
    gold = [
        {"Country": "France", "Capital": "Paris"},
        {"Country": "Spain", "Capital": "Madrid"}
    ]
    metrics = evaluate_table(pred, gold)
    assert metrics["item_f1"] < 1.0
    assert metrics["item_f1"] > 0.0
    assert metrics["row_f1"] == 0.5 # 1 out of 2 rows correct
