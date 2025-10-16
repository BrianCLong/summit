#!/usr/bin/env python3
"""
Symphony Orchestra MVP-3: Provider Reconciliation
Live quota management with ETA tracking and auto-adjustment
"""

import json
import logging
import re
import time
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any

import redis
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

logger = logging.getLogger(__name__)


@dataclass
class QuotaInfo:
    """Live quota information from provider"""

    provider: str
    quota_type: str  # rpm, tpm, daily, etc.
    current_usage: int
    quota_limit: int
    reset_time: datetime
    rate_limit_headers: dict[str, str]
    last_updated: datetime

    @property
    def remaining(self) -> int:
        return max(0, self.quota_limit - self.current_usage)

    @property
    def utilization_percent(self) -> float:
        if self.quota_limit == 0:
            return 0.0
        return (self.current_usage / self.quota_limit) * 100

    @property
    def eta_to_reset(self) -> int:
        """Seconds until quota resets"""
        return max(0, int((self.reset_time - datetime.now()).total_seconds()))


@dataclass
class PolicyDiff:
    """Difference between policy and observed quotas"""

    provider: str
    quota_type: str
    policy_value: int
    observed_value: int
    variance_percent: float
    recommended_action: str
    confidence: float


class ProviderAdapter(ABC):
    """Abstract base for provider-specific quota adapters"""

    @abstractmethod
    def get_quota_info(self) -> list[QuotaInfo]:
        """Get current quota information from provider"""
        pass

    @abstractmethod
    def parse_rate_limit_headers(self, headers: dict[str, str]) -> QuotaInfo:
        """Parse rate limit info from API response headers"""
        pass


class OpenAIAdapter(ProviderAdapter):
    """OpenAI quota adapter"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.openai.com/v1"

    def get_quota_info(self) -> list[QuotaInfo]:
        """Get OpenAI quota info from API response headers"""
        quotas = []

        try:
            # Make a small test request to get headers
            response = requests.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )

            if response.status_code == 200:
                quota = self.parse_rate_limit_headers(response.headers)
                if quota:
                    quotas.append(quota)

        except Exception as e:
            logger.error(f"Failed to get OpenAI quota info: {e}")

        return quotas

    def parse_rate_limit_headers(self, headers: dict[str, str]) -> QuotaInfo | None:
        """Parse OpenAI rate limit headers"""

        # OpenAI uses X-RateLimit-* headers
        rpm_limit = headers.get("x-ratelimit-limit-requests")
        rpm_remaining = headers.get("x-ratelimit-remaining-requests")
        reset_requests = headers.get("x-ratelimit-reset-requests")

        if rpm_limit and rpm_remaining and reset_requests:
            return QuotaInfo(
                provider="openai",
                quota_type="rpm",
                current_usage=int(rpm_limit) - int(rpm_remaining),
                quota_limit=int(rpm_limit),
                reset_time=datetime.now() + timedelta(seconds=int(reset_requests.rstrip("s"))),
                rate_limit_headers=dict(headers),
                last_updated=datetime.now(),
            )

        return None


class AnthropicAdapter(ProviderAdapter):
    """Anthropic quota adapter"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.anthropic.com/v1"

    def get_quota_info(self) -> list[QuotaInfo]:
        """Get Anthropic quota info"""
        quotas = []

        try:
            # Anthropic doesn't expose quota endpoints, so we track from headers
            response = requests.post(
                f"{self.base_url}/messages",
                headers={
                    "x-api-key": self.api_key,
                    "content-type": "application/json",
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "ping"}],
                },
                timeout=10,
            )

            quota = self.parse_rate_limit_headers(response.headers)
            if quota:
                quotas.append(quota)

        except Exception as e:
            logger.error(f"Failed to get Anthropic quota info: {e}")

        return quotas

    def parse_rate_limit_headers(self, headers: dict[str, str]) -> QuotaInfo | None:
        """Parse Anthropic rate limit headers"""

        # Anthropic uses custom headers (format may vary)
        rpm_limit = headers.get("anthropic-ratelimit-requests-limit")
        rpm_remaining = headers.get("anthropic-ratelimit-requests-remaining")
        reset_time = headers.get("anthropic-ratelimit-requests-reset")

        if rpm_limit and rpm_remaining:
            reset_dt = datetime.now() + timedelta(hours=1)  # Default 1 hour
            if reset_time:
                try:
                    reset_dt = datetime.fromisoformat(reset_time.replace("Z", "+00:00"))
                except:
                    pass

            return QuotaInfo(
                provider="anthropic",
                quota_type="rpm",
                current_usage=int(rpm_limit) - int(rpm_remaining),
                quota_limit=int(rpm_limit),
                reset_time=reset_dt,
                rate_limit_headers=dict(headers),
                last_updated=datetime.now(),
            )

        return None


class GrokAdapter(ProviderAdapter):
    """Grok (X.AI) quota adapter with web scraping"""

    def __init__(self, credentials: dict[str, str]):
        self.username = credentials.get("username")
        self.password = credentials.get("password")
        self.base_url = "https://console.x.ai"

    def get_quota_info(self) -> list[QuotaInfo]:
        """Get Grok quota info via web scraping"""
        quotas = []

        if not self.username or not self.password:
            logger.warning("Grok credentials not provided, using defaults")
            return [self._get_default_quota()]

        try:
            quotas = self._scrape_console_quotas()
        except Exception as e:
            logger.error(f"Failed to scrape Grok quotas: {e}")
            quotas = [self._get_default_quota()]

        return quotas

    def _scrape_console_quotas(self) -> list[QuotaInfo]:
        """Scrape quota info from Grok console"""

        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        driver = webdriver.Chrome(options=options)

        try:
            # Login to console
            driver.get(f"{self.base_url}/login")
            time.sleep(2)

            # Fill credentials (simplified - real implementation would be more robust)
            username_field = driver.find_element(By.NAME, "username")
            password_field = driver.find_element(By.NAME, "password")

            username_field.send_keys(self.username)
            password_field.send_keys(self.password)

            login_button = driver.find_element(By.TYPE, "submit")
            login_button.click()

            time.sleep(5)

            # Navigate to usage/quotas page
            driver.get(f"{self.base_url}/usage")
            time.sleep(3)

            # Parse quota information from page
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, "html.parser")

            # Look for quota indicators (structure depends on actual UI)
            quota_elements = soup.find_all(class_=re.compile(r"quota|limit|usage"))

            for element in quota_elements:
                text = element.get_text(strip=True)
                # Parse quota info from text (simplified)
                if "requests" in text.lower() and "/" in text:
                    parts = text.split("/")
                    if len(parts) == 2:
                        current = int(re.findall(r"\d+", parts[0])[0])
                        limit = int(re.findall(r"\d+", parts[1])[0])

                        return [
                            QuotaInfo(
                                provider="grok",
                                quota_type="rpm",
                                current_usage=current,
                                quota_limit=limit,
                                reset_time=datetime.now() + timedelta(minutes=1),
                                rate_limit_headers={},
                                last_updated=datetime.now(),
                            )
                        ]

            return [self._get_default_quota()]

        finally:
            driver.quit()

    def _get_default_quota(self) -> QuotaInfo:
        """Default quota when scraping fails"""
        return QuotaInfo(
            provider="grok",
            quota_type="rpm",
            current_usage=15,  # Estimate
            quota_limit=30,  # Conservative estimate
            reset_time=datetime.now() + timedelta(minutes=1),
            rate_limit_headers={},
            last_updated=datetime.now(),
        )

    def parse_rate_limit_headers(self, headers: dict[str, str]) -> QuotaInfo | None:
        """Parse Grok rate limit headers"""

        # Grok/X.AI header format (assumed)
        limit = headers.get("x-ratelimit-limit-requests-per-minute")
        remaining = headers.get("x-ratelimit-remaining-requests-per-minute")
        reset = headers.get("x-ratelimit-reset-requests")

        if limit and remaining:
            return QuotaInfo(
                provider="grok",
                quota_type="rpm",
                current_usage=int(limit) - int(remaining),
                quota_limit=int(limit),
                reset_time=datetime.now() + timedelta(seconds=int(reset or 60)),
                rate_limit_headers=dict(headers),
                last_updated=datetime.now(),
            )

        return None


class DeepSeekAdapter(ProviderAdapter):
    """DeepSeek quota adapter"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.deepseek.com/v1"

    def get_quota_info(self) -> list[QuotaInfo]:
        """Get DeepSeek quota info"""
        quotas = []

        try:
            # Test API call to get headers
            response = requests.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )

            quota = self.parse_rate_limit_headers(response.headers)
            if quota:
                quotas.append(quota)
            else:
                # Use default if no headers
                quotas.append(
                    QuotaInfo(
                        provider="deepseek",
                        quota_type="rpm",
                        current_usage=25,
                        quota_limit=100,
                        reset_time=datetime.now() + timedelta(minutes=1),
                        rate_limit_headers={},
                        last_updated=datetime.now(),
                    )
                )

        except Exception as e:
            logger.error(f"Failed to get DeepSeek quota info: {e}")

        return quotas

    def parse_rate_limit_headers(self, headers: dict[str, str]) -> QuotaInfo | None:
        """Parse DeepSeek rate limit headers"""

        # DeepSeek header format (assumed - may vary)
        limit = headers.get("x-ratelimit-limit")
        remaining = headers.get("x-ratelimit-remaining")
        reset = headers.get("x-ratelimit-reset")

        if limit and remaining:
            return QuotaInfo(
                provider="deepseek",
                quota_type="rpm",
                current_usage=int(limit) - int(remaining),
                quota_limit=int(limit),
                reset_time=datetime.now() + timedelta(seconds=int(reset or 60)),
                rate_limit_headers=dict(headers),
                last_updated=datetime.now(),
            )

        return None


class ProviderReconciler:
    """Production-grade provider reconciliation system"""

    def __init__(self, redis_url: str = "redis://localhost:6379/3"):
        self.redis = redis.from_url(redis_url)
        self.adapters = {}
        self.policy_path = "orchestration.yml"

        # Initialize adapters with credentials
        self._initialize_adapters()

    def _initialize_adapters(self):
        """Initialize provider adapters with credentials"""
        import os

        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            self.adapters["openai"] = OpenAIAdapter(openai_key)

        # Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            self.adapters["anthropic"] = AnthropicAdapter(anthropic_key)

        # Grok
        grok_creds = {
            "username": os.getenv("GROK_USERNAME"),
            "password": os.getenv("GROK_PASSWORD"),
        }
        self.adapters["grok"] = GrokAdapter(grok_creds)

        # DeepSeek
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key:
            self.adapters["deepseek"] = DeepSeekAdapter(deepseek_key)

    def collect_live_quotas(self) -> dict[str, list[QuotaInfo]]:
        """Collect live quota information from all providers"""

        quotas = {}

        for provider, adapter in self.adapters.items():
            try:
                logger.info(f"Collecting quotas from {provider}")
                provider_quotas = adapter.get_quota_info()
                quotas[provider] = provider_quotas

                # Store in Redis for real-time access
                self._store_quota_info(provider, provider_quotas)

            except Exception as e:
                logger.error(f"Failed to collect quotas from {provider}: {e}")
                quotas[provider] = []

        return quotas

    def _store_quota_info(self, provider: str, quotas: list[QuotaInfo]):
        """Store quota info in Redis for real-time access"""

        for quota in quotas:
            key = f"quota:live:{provider}:{quota.quota_type}"

            quota_data = asdict(quota)
            quota_data["reset_time"] = quota.reset_time.isoformat()
            quota_data["last_updated"] = quota.last_updated.isoformat()

            # Store with TTL based on reset time
            ttl = max(300, quota.eta_to_reset)  # At least 5 minutes
            self.redis.setex(key, ttl, json.dumps(quota_data))

    def get_live_quota(self, provider: str, quota_type: str = "rpm") -> QuotaInfo | None:
        """Get live quota info from Redis cache"""

        key = f"quota:live:{provider}:{quota_type}"
        data = self.redis.get(key)

        if data:
            quota_dict = json.loads(data)
            quota_dict["reset_time"] = datetime.fromisoformat(quota_dict["reset_time"])
            quota_dict["last_updated"] = datetime.fromisoformat(quota_dict["last_updated"])
            return QuotaInfo(**quota_dict)

        return None

    def get_policy_quotas(self) -> dict[str, dict[str, int]]:
        """Get quota limits from policy file"""

        try:
            with open(self.policy_path) as f:
                import yaml

                policy = yaml.safe_load(f)

            quotas = {}

            # Extract quota info from policy
            if "providers" in policy:
                for provider, config in policy["providers"].items():
                    quotas[provider] = {
                        "rpm": config.get("rpm_limit", 60),
                        "tpm": config.get("tpm_limit", 40000),
                        "daily": config.get("daily_limit", 1000000),
                    }

            return quotas

        except Exception as e:
            logger.error(f"Failed to load policy quotas: {e}")
            return {}

    def reconcile_quotas(self) -> list[PolicyDiff]:
        """Compare policy quotas with observed quotas"""

        live_quotas = self.collect_live_quotas()
        policy_quotas = self.get_policy_quotas()

        diffs = []

        for provider in live_quotas.keys():
            if provider not in policy_quotas:
                continue

            policy_provider = policy_quotas[provider]
            live_provider = live_quotas[provider]

            # Compare each quota type
            for quota_info in live_provider:
                quota_type = quota_info.quota_type

                if quota_type in policy_provider:
                    policy_value = policy_provider[quota_type]
                    observed_value = quota_info.quota_limit

                    if policy_value != observed_value:
                        variance = ((observed_value - policy_value) / policy_value) * 100

                        # Determine recommended action
                        if abs(variance) > 20:  # >20% variance
                            if observed_value > policy_value:
                                action = "increase_policy_limit"
                            else:
                                action = "investigate_provider_reduction"
                        else:
                            action = "update_runtime_cap"

                        diff = PolicyDiff(
                            provider=provider,
                            quota_type=quota_type,
                            policy_value=policy_value,
                            observed_value=observed_value,
                            variance_percent=variance,
                            recommended_action=action,
                            confidence=0.8,
                        )

                        diffs.append(diff)

        # Store reconciliation results
        self._store_reconciliation_results(diffs)

        return diffs

    def _store_reconciliation_results(self, diffs: list[PolicyDiff]):
        """Store reconciliation results"""

        results = {
            "timestamp": datetime.now().isoformat(),
            "total_diffs": len(diffs),
            "diffs": [asdict(diff) for diff in diffs],
        }

        self.redis.setex("reconciliation:latest", 3600, json.dumps(results))

        # Also log to file for audit trail
        with open("/tmp/quota_reconciliation.jsonl", "a") as f:
            f.write(json.dumps(results) + "\n")

    def auto_adjust_runtime_caps(self, diffs: list[PolicyDiff]):
        """Auto-adjust runtime caps based on reconciliation"""

        for diff in diffs:
            if diff.recommended_action == "update_runtime_cap" and diff.confidence > 0.7:

                # Update runtime cap in Redis (not policy file)
                runtime_key = f"runtime_cap:{diff.provider}:{diff.quota_type}"
                new_cap = diff.observed_value

                self.redis.setex(runtime_key, 86400, str(new_cap))  # 24h TTL

                logger.info(
                    f"Auto-adjusted runtime cap for {diff.provider} {diff.quota_type}: {new_cap}"
                )

                # Log explanation
                explanation = {
                    "timestamp": datetime.now().isoformat(),
                    "provider": diff.provider,
                    "quota_type": diff.quota_type,
                    "old_cap": diff.policy_value,
                    "new_cap": new_cap,
                    "reason": f"Observed limit is {diff.observed_value}, policy has {diff.policy_value}",
                    "variance_percent": diff.variance_percent,
                    "action": "runtime_cap_adjustment",
                }

                with open("/tmp/auto_adjustments.jsonl", "a") as f:
                    f.write(json.dumps(explanation) + "\n")

    def generate_model_matrix(self) -> dict[str, Any]:
        """Generate Model Matrix with live caps and ETAs"""

        matrix = {"timestamp": datetime.now().isoformat(), "providers": {}}

        for provider in ["openai", "anthropic", "grok", "deepseek"]:
            quota_info = self.get_live_quota(provider)

            if quota_info:
                matrix["providers"][provider] = {
                    "quota_limit": quota_info.quota_limit,
                    "current_usage": quota_info.current_usage,
                    "remaining": quota_info.remaining,
                    "utilization_percent": quota_info.utilization_percent,
                    "eta_to_reset_seconds": quota_info.eta_to_reset,
                    "eta_formatted": self._format_eta(quota_info.eta_to_reset),
                    "status": self._get_provider_status(quota_info),
                }
            else:
                matrix["providers"][provider] = {
                    "status": "unavailable",
                    "quota_limit": 0,
                    "remaining": 0,
                    "eta_formatted": "Unknown",
                }

        return matrix

    def _format_eta(self, seconds: int) -> str:
        """Format ETA in human-readable format"""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"

    def _get_provider_status(self, quota: QuotaInfo) -> str:
        """Determine provider status based on quota"""
        if quota.utilization_percent >= 95:
            return "exhausted"
        elif quota.utilization_percent >= 80:
            return "high_usage"
        elif quota.utilization_percent >= 50:
            return "moderate_usage"
        else:
            return "available"


def main():
    """CLI interface for provider reconciliation"""
    import argparse

    parser = argparse.ArgumentParser(description="Symphony Orchestra Provider Reconciliation")
    parser.add_argument("command", choices=["collect", "reconcile", "matrix", "status"])
    parser.add_argument("--provider", help="Specific provider to check")
    parser.add_argument("--auto-adjust", action="store_true", help="Auto-adjust runtime caps")

    args = parser.parse_args()

    reconciler = ProviderReconciler()

    if args.command == "collect":
        quotas = reconciler.collect_live_quotas()
        for provider, provider_quotas in quotas.items():
            print(f"\n{provider}:")
            for quota in provider_quotas:
                print(
                    f"  {quota.quota_type}: {quota.current_usage}/{quota.quota_limit} "
                    f"(ETA: {reconciler._format_eta(quota.eta_to_reset)})"
                )

    elif args.command == "reconcile":
        diffs = reconciler.reconcile_quotas()
        print(f"Found {len(diffs)} quota differences:")

        for diff in diffs:
            print(
                f"  {diff.provider} {diff.quota_type}: "
                f"policy={diff.policy_value}, observed={diff.observed_value} "
                f"({diff.variance_percent:+.1f}%) -> {diff.recommended_action}"
            )

        if args.auto_adjust:
            reconciler.auto_adjust_runtime_caps(diffs)
            print("Runtime caps auto-adjusted where appropriate")

    elif args.command == "matrix":
        matrix = reconciler.generate_model_matrix()
        print(json.dumps(matrix, indent=2))

    elif args.command == "status":
        if args.provider:
            quota = reconciler.get_live_quota(args.provider)
            if quota:
                print(
                    f"{args.provider}: {quota.current_usage}/{quota.quota_limit} "
                    f"({quota.utilization_percent:.1f}%) "
                    f"ETA: {reconciler._format_eta(quota.eta_to_reset)}"
                )
            else:
                print(f"{args.provider}: No quota data available")
        else:
            matrix = reconciler.generate_model_matrix()
            for provider, info in matrix["providers"].items():
                status = info.get("status", "unknown")
                remaining = info.get("remaining", 0)
                eta = info.get("eta_formatted", "Unknown")
                print(f"{provider}: {status} (remaining: {remaining}, ETA: {eta})")


if __name__ == "__main__":
    main()
