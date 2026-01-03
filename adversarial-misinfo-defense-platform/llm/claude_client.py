"""
Claude API Client for Adversarial Misinformation Defense Platform

Provides a robust wrapper around the Anthropic Python SDK with:
- Retry logic with exponential backoff
- Rate limiting (token bucket pattern)
- Cost tracking (input/output tokens)
- Comprehensive error handling
"""

import os
import time
import logging
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime

try:
    import anthropic
    from anthropic import APIError, RateLimitError, APIConnectionError
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    anthropic = None
    APIError = Exception
    RateLimitError = Exception
    APIConnectionError = Exception

logger = logging.getLogger(__name__)


@dataclass
class LLMConfig:
    """Configuration for LLM client."""

    api_key: str = field(default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY", ""))
    model: str = "claude-opus-4-5-20250514"
    max_tokens: int = 4096
    temperature: float = 0.7

    # Rate limiting
    requests_per_minute: int = 60
    tokens_per_minute: int = 100000

    # Cost tracking
    cost_cap_usd: float = 100.0

    # Retry settings
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0

    # Safety
    enable_content_filter: bool = True
    audit_logging: bool = True

    def validate(self) -> bool:
        """Validate configuration."""
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY not set. LLM features will be disabled.")
            return False
        return True


@dataclass
class UsageStats:
    """Track API usage and costs."""

    total_requests: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    requests_this_minute: int = 0
    tokens_this_minute: int = 0
    minute_start: float = field(default_factory=time.time)

    # Pricing (approximate)
    INPUT_COST_PER_1K = 0.015
    OUTPUT_COST_PER_1K = 0.075

    def add_usage(self, input_tokens: int, output_tokens: int) -> None:
        """Record token usage."""
        self.total_requests += 1
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens

        input_cost = (input_tokens / 1000) * self.INPUT_COST_PER_1K
        output_cost = (output_tokens / 1000) * self.OUTPUT_COST_PER_1K
        self.total_cost_usd += input_cost + output_cost

        self.requests_this_minute += 1
        self.tokens_this_minute += input_tokens + output_tokens

    def reset_minute_counters(self) -> None:
        """Reset per-minute counters."""
        self.requests_this_minute = 0
        self.tokens_this_minute = 0
        self.minute_start = time.time()

    def get_summary(self) -> Dict[str, Any]:
        """Get usage summary."""
        return {
            "total_requests": self.total_requests,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_cost_usd": round(self.total_cost_usd, 4),
        }


@dataclass
class LLMResponse:
    """Structured response from LLM."""

    content: str
    input_tokens: int
    output_tokens: int
    model: str
    stop_reason: str
    latency_ms: float

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


class ClaudeClient:
    """Claude API client with retry logic, rate limiting, and cost tracking."""

    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig()
        self.stats = UsageStats()
        self._client: Optional[Any] = None
        self._initialized = False
        self._audit_log: List[Dict[str, Any]] = []

        if not ANTHROPIC_AVAILABLE:
            logger.warning("anthropic package not installed. Run: pip install anthropic>=0.40.0")

    def initialize(self) -> bool:
        """Initialize the API client."""
        if not ANTHROPIC_AVAILABLE:
            logger.error("Cannot initialize: anthropic package not available")
            return False

        if not self.config.validate():
            return False

        try:
            self._client = anthropic.Anthropic(api_key=self.config.api_key)
            self._initialized = True
            logger.info(f"Claude client initialized with model: {self.config.model}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Claude client: {e}")
            return False

    def _check_rate_limits(self) -> None:
        """Check and enforce rate limits."""
        current_time = time.time()

        if current_time - self.stats.minute_start >= 60:
            self.stats.reset_minute_counters()

        if self.stats.requests_this_minute >= self.config.requests_per_minute:
            wait_time = 60 - (current_time - self.stats.minute_start)
            if wait_time > 0:
                logger.info(f"Rate limit reached. Waiting {wait_time:.1f}s")
                time.sleep(wait_time)
                self.stats.reset_minute_counters()

        if self.stats.tokens_this_minute >= self.config.tokens_per_minute:
            wait_time = 60 - (current_time - self.stats.minute_start)
            if wait_time > 0:
                logger.info(f"Token rate limit reached. Waiting {wait_time:.1f}s")
                time.sleep(wait_time)
                self.stats.reset_minute_counters()

    def _check_cost_cap(self) -> bool:
        """Check if cost cap has been reached."""
        if self.stats.total_cost_usd >= self.config.cost_cap_usd:
            logger.error(f"Cost cap of ${self.config.cost_cap_usd} reached.")
            return False
        return True

    def _log_audit(self, prompt: str, response: Optional[LLMResponse], error: Optional[str] = None) -> None:
        """Log request for audit purposes."""
        if not self.config.audit_logging:
            return

        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "model": self.config.model,
            "prompt_length": len(prompt),
            "success": response is not None,
        }

        if response:
            entry.update({
                "input_tokens": response.input_tokens,
                "output_tokens": response.output_tokens,
                "latency_ms": response.latency_ms,
            })

        if error:
            entry["error"] = error

        self._audit_log.append(entry)

        if len(self._audit_log) > 1000:
            self._audit_log = self._audit_log[-1000:]

    def complete(
        self,
        prompt: str,
        system: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Optional[LLMResponse]:
        """Send a completion request to Claude."""
        if not self._initialized:
            if not self.initialize():
                return None

        if not self._check_cost_cap():
            return None

        self._check_rate_limits()

        messages = [{"role": "user", "content": prompt}]

        kwargs = {
            "model": self.config.model,
            "max_tokens": max_tokens or self.config.max_tokens,
            "messages": messages,
        }

        if system:
            kwargs["system"] = system

        if temperature is not None:
            kwargs["temperature"] = temperature
        else:
            kwargs["temperature"] = self.config.temperature

        delay = self.config.base_delay
        last_error = None

        for attempt in range(self.config.max_retries):
            try:
                start_time = time.time()
                response = self._client.messages.create(**kwargs)
                latency_ms = (time.time() - start_time) * 1000

                content = ""
                if response.content:
                    content = response.content[0].text if hasattr(response.content[0], 'text') else str(response.content[0])

                llm_response = LLMResponse(
                    content=content,
                    input_tokens=response.usage.input_tokens,
                    output_tokens=response.usage.output_tokens,
                    model=response.model,
                    stop_reason=response.stop_reason or "unknown",
                    latency_ms=latency_ms,
                )

                self.stats.add_usage(llm_response.input_tokens, llm_response.output_tokens)
                self._log_audit(prompt, llm_response)

                return llm_response

            except RateLimitError as e:
                last_error = str(e)
                logger.warning(f"Rate limit hit (attempt {attempt + 1}): {e}")
                time.sleep(delay)
                delay = min(delay * 2, self.config.max_delay)

            except APIConnectionError as e:
                last_error = str(e)
                logger.warning(f"Connection error (attempt {attempt + 1}): {e}")
                time.sleep(delay)
                delay = min(delay * 2, self.config.max_delay)

            except APIError as e:
                last_error = str(e)
                logger.error(f"API error: {e}")
                self._log_audit(prompt, None, str(e))
                return None

            except Exception as e:
                last_error = str(e)
                logger.error(f"Unexpected error: {e}")
                self._log_audit(prompt, None, str(e))
                return None

        logger.error(f"All {self.config.max_retries} attempts failed. Last error: {last_error}")
        self._log_audit(prompt, None, f"Max retries exceeded: {last_error}")
        return None

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics."""
        return self.stats.get_summary()

    def get_audit_log(self) -> List[Dict[str, Any]]:
        """Get audit log entries."""
        return self._audit_log.copy()

    def is_available(self) -> bool:
        """Check if the client is available and configured."""
        return ANTHROPIC_AVAILABLE and self.config.validate()
