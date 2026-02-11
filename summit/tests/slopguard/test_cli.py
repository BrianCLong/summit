import pytest
from unittest.mock import patch, MagicMock, mock_open
from summit.slopguard.cli import main, redact_dict, write_evidence
from summit.slopguard.policy import SlopDecision

def test_redact_dict():
    data = {"secret_key": "123", "public": "abc", "nested": {"password": "pass"}}
    redacted = redact_dict(data, ["secret", "password"])
    assert redacted["secret_key"] == "[REDACTED]"
    assert redacted["public"] == "abc"
    assert redacted["nested"]["password"] == "[REDACTED]"

def test_main_allowed(capsys):
    with patch("summit.slopguard.cli.argparse.ArgumentParser") as MockParser, \
         patch("summit.slopguard.cli.os.path.exists", return_value=True), \
         patch("builtins.open", mock_open(read_data='{}')), \
         patch("json.load", return_value={}), \
         patch("summit.slopguard.cli.evaluate_artifact") as mock_eval, \
         patch("summit.slopguard.cli.write_evidence"):

        mock_parser_instance = MockParser.return_value
        mock_parser_instance.parse_args.return_value = MagicMock(artifact="artifact.json", policy="policy.json", override_reason=None)

        mock_eval.return_value = SlopDecision(allowed=True, score=1.0, reasons=[], policy_version="1.0", metadata={})

        main()

        captured = capsys.readouterr()
        assert "Decision: ALLOWED" in captured.out

def test_main_denied(capsys):
    with patch("summit.slopguard.cli.argparse.ArgumentParser") as MockParser, \
         patch("summit.slopguard.cli.os.path.exists", return_value=True), \
         patch("builtins.open", mock_open(read_data='{}')), \
         patch("json.load", return_value={}), \
         patch("summit.slopguard.cli.evaluate_artifact") as mock_eval, \
         patch("summit.slopguard.cli.write_evidence"), \
         patch("sys.exit") as mock_exit:

        mock_parser_instance = MockParser.return_value
        mock_parser_instance.parse_args.return_value = MagicMock(artifact="artifact.json", policy="policy.json", override_reason=None)

        mock_eval.return_value = SlopDecision(allowed=False, score=0.0, reasons=["reason1"], policy_version="1.0", metadata={})

        main()

        captured = capsys.readouterr()
        assert "Decision: DENIED" in captured.out
        mock_exit.assert_called_with(1)
