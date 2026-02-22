import pytest
from unittest.mock import patch, MagicMock
from summit.agents.cli import run_list, run_install

def test_run_list_success(capsys):
    with patch("summit.agents.cli.fetch_registry_json") as mock_fetch,          patch("summit.agents.cli.parse_agents") as mock_parse:

        mock_fetch.return_value = {}
        mock_agent = MagicMock()
        mock_agent.id = "agent-1"
        mock_agent.name = "Test Agent"
        mock_agent.version = "1.0.0"
        mock_parse.return_value = [mock_agent]

        args = MagicMock()
        args.provider = "acp"

        ret = run_list(args)
        assert ret == 0

        captured = capsys.readouterr()
        assert "agent-1" in captured.out
        assert "Test Agent" in captured.out

def test_run_install_success(capsys):
    with patch("summit.agents.cli.fetch_registry_json") as mock_fetch,          patch("summit.agents.cli.parse_agents") as mock_parse,          patch("summit.agents.cli.plan_install") as mock_plan,          patch("summit.agents.cli.AcpPolicy") as mock_policy:

        mock_fetch.return_value = {}
        mock_agent = MagicMock()
        mock_agent.id = "agent-1"
        mock_parse.return_value = [mock_agent]

        mock_plan_result = MagicMock()
        mock_plan_result.kind = "test-kind"
        mock_plan_result.argv = ["echo", "hello"]
        mock_plan_result.notes = ["note1"]
        mock_plan.return_value = mock_plan_result

        args = MagicMock()
        args.agent_id = "acp:agent-1"

        ret = run_install(args)
        assert ret == 0

        captured = capsys.readouterr()
        assert "Install Plan for agent-1" in captured.out
        assert "echo hello" in captured.out
