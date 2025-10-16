"""Configuration utilities for the IG-RL service."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(slots=True)
class KafkaConfig:
    """Connection details for Kafka topics consumed and produced by IG-RL."""

    bootstrap_servers: str = "localhost:9092"
    security_protocol: str = "PLAINTEXT"
    sasl_mechanism: str | None = None
    sasl_username: str | None = None
    sasl_password: str | None = None
    input_topics: list[str] = field(
        default_factory=lambda: ["rl.events", "coa.sim", "policy"],
    )
    output_topics: list[str] = field(
        default_factory=lambda: ["rl.decisions", "rl.metrics"],
    )


@dataclass(slots=True)
class GraphQLConfig:
    """Settings for the IntelGraph GraphQL gateway."""

    endpoint: str = "http://localhost:4000/graphql"
    api_key: str | None = None
    timeout_seconds: int = 30


@dataclass(slots=True)
class RewardConfig:
    """Baseline KPI weights used by the reward hub."""

    kpi_weights: dict[str, float] = field(
        default_factory=lambda: {
            "time_to_insight": 0.5,
            "accuracy": 0.3,
            "cost": 0.2,
        },
    )
    default_reward_name: str = "default"


@dataclass(slots=True)
class ServiceConfig:
    """Top-level configuration for the RL service."""

    kafka: KafkaConfig = field(default_factory=KafkaConfig)
    graphql: GraphQLConfig = field(default_factory=GraphQLConfig)
    reward: RewardConfig = field(default_factory=RewardConfig)
    provenance_topic: str = "prov.ledger"
    policy_endpoint: str = "http://localhost:8080/v1/data/intelgraph"
    explainability_topic: str = "xai.cards"

    @classmethod
    def from_env(cls) -> ServiceConfig:
        """Construct configuration by reading environment variables."""

        kafka = KafkaConfig(
            bootstrap_servers=os.getenv("IG_RL_KAFKA_BOOTSTRAP", "localhost:9092"),
            security_protocol=os.getenv("IG_RL_KAFKA_SECURITY", "PLAINTEXT"),
            sasl_mechanism=os.getenv("IG_RL_KAFKA_SASL_MECHANISM"),
            sasl_username=os.getenv("IG_RL_KAFKA_SASL_USERNAME"),
            sasl_password=os.getenv("IG_RL_KAFKA_SASL_PASSWORD"),
        )
        graphql = GraphQLConfig(
            endpoint=os.getenv("IG_RL_GRAPHQL_ENDPOINT", "http://localhost:4000/graphql"),
            api_key=os.getenv("IG_RL_GRAPHQL_API_KEY"),
            timeout_seconds=int(os.getenv("IG_RL_GRAPHQL_TIMEOUT", "30")),
        )
        reward = RewardConfig()

        default_weights = os.getenv("IG_RL_REWARD_WEIGHTS")
        if default_weights:
            parsed = {}
            for pair in default_weights.split(","):
                if not pair:
                    continue
                key, _, value = pair.partition(":")
                if not key or not value:
                    continue
                try:
                    parsed[key.strip()] = float(value)
                except ValueError:
                    continue
            if parsed:
                reward.kpi_weights = parsed

        reward.default_reward_name = os.getenv("IG_RL_REWARD_DEFAULT", "default")

        return cls(
            kafka=kafka,
            graphql=graphql,
            reward=reward,
            provenance_topic=os.getenv("IG_RL_PROVENANCE_TOPIC", "prov.ledger"),
            policy_endpoint=os.getenv(
                "IG_RL_POLICY_ENDPOINT", "http://localhost:8080/v1/data/intelgraph"
            ),
            explainability_topic=os.getenv("IG_RL_XAI_TOPIC", "xai.cards"),
        )
