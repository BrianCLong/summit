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
        _, kwargs = mock_post.call_args
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
        provider.generate("llama2", "Hi", options={"temperature": 0.0})

        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        assert kwargs["json"]["options"]["temperature"] == 0.0


def test_ollama_generate_retries_on_transient_failure():
    provider = OllamaProvider(max_retries=2, retry_backoff_s=0)

    first = requests.exceptions.ConnectionError("boom")
    second = requests.exceptions.Timeout("timeout")
    success = Mock()
    success.raise_for_status.return_value = None
    success.json.return_value = {"response": "Recovered"}

    with patch("requests.post", side_effect=[first, second, success]) as mock_post:
        with patch("time.sleep") as mock_sleep:
            result = provider.generate("llama2", "Retry")

    assert mock_post.call_count == 3
    assert mock_sleep.call_count == 2
    assert result["response"] == "Recovered"


def test_ollama_generate_raises_when_retries_exhausted():
    provider = OllamaProvider(max_retries=1, retry_backoff_s=0)

    with patch("requests.post", side_effect=requests.exceptions.ConnectionError("fail")):
        with pytest.raises(requests.exceptions.ConnectionError):
            provider.generate("llama2", "Nope")


def test_ollama_health_success():
    provider = OllamaProvider()

    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.text = "Ollama is running"
    mock_response.raise_for_status.return_value = None

    with patch("requests.get", return_value=mock_response):
        result = provider.health()

    assert result["ok"] is True
    assert result["status_code"] == 200
    assert result["body"] == "Ollama is running"
