from unittest.mock import Mock, patch

import pytest
import requests

from summit.providers.ollama import OllamaProvider


def test_ollama_generate_success():
    provider = OllamaProvider()

    mock_response = Mock()
    mock_response.json.return_value = {"response": "Hello world", "done": True}
    mock_response.raise_for_status.return_value = None

    with patch("requests.post", return_value=mock_response) as mock_post:
        result = provider.generate("llama2", "Hi")

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs["json"]["model"] == "llama2"
        assert kwargs["json"]["prompt"] == "Hi"
        assert kwargs["json"]["stream"] is False

        assert result["response"] == "Hello world"
        assert "request_digest" in result

def test_ollama_generate_with_options():
    provider = OllamaProvider()

    mock_response = Mock()
    mock_response.json.return_value = {"response": "Hi", "done": True}
    mock_response.raise_for_status.return_value = None

    with patch("requests.post", return_value=mock_response) as mock_post:
        result = provider.generate("llama2", "Hi", options={"temperature": 0.0})

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs["json"]["options"]["temperature"] == 0.0
