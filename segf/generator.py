"""Core generation logic for Synthetic Entity Graph Forge (SEGF)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import networkx as nx
import numpy as np
import pandas as pd

from .config import (
    DriftScenario,
    EventConfig,
    FraudRingConfig,
    LifecycleConfig,
    PopulationConfig,
    SegfConfig,
)


@dataclass
class GenerationResult:
    """Artifacts produced by a generation run."""

    users: pd.DataFrame
    devices: pd.DataFrame
    merchants: pd.DataFrame
    lifecycles: pd.DataFrame
    events: pd.DataFrame
    graph: nx.MultiDiGraph

    def write(self, output_dir: Path) -> None:
        """Persist tables as Parquet and the entity graph as GraphML."""

        output_dir.mkdir(parents=True, exist_ok=True)
        tables = {
            "users": self.users,
            "devices": self.devices,
            "merchants": self.merchants,
            "lifecycles": self.lifecycles,
            "events": self.events,
        }
        for name, frame in tables.items():
            frame.to_parquet(output_dir / f"{name}.parquet", index=False)

        nx.write_graphml(self.graph, output_dir / "entity_graph.graphml")


class SyntheticEntityGraphForge:
    """Generator for synthetic multi-entity graphs with temporal dynamics."""

    def __init__(self, config: Optional[SegfConfig] = None, *, seed: Optional[int] = None) -> None:
        self.config = config or SegfConfig()
        self.rng = np.random.default_rng(seed if seed is not None else self.config.random_seed)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def generate(self) -> GenerationResult:
        population = self.config.population
        lifecycle = self.config.lifecycle
        events_cfg = self.config.events
        fraud_cfg = self.config.fraud_rings

        users = self._create_users(population, lifecycle)
        merchants = self._create_merchants(population)
        device_records, user_device_edges = self._assign_devices(users, population, fraud_cfg)
        merchant_links = self._assign_merchants(users, merchants, population, fraud_cfg)
        lifecycles = self._build_lifecycles(users, lifecycle)
        events = self._generate_events(users, lifecycles, merchant_links, events_cfg)
        graph = self._build_graph(users, device_records, merchants, user_device_edges, events)

        return GenerationResult(
            users=users,
            devices=device_records,
            merchants=merchants,
            lifecycles=lifecycles,
            events=events,
            graph=graph,
        )

    def generate_to(self, output_dir: Path) -> GenerationResult:
        """Helper that generates and immediately writes artifacts."""

        result = self.generate()
        result.write(output_dir)
        return result

    # ------------------------------------------------------------------
    # Entity creation helpers
    # ------------------------------------------------------------------
    def _create_users(self, population: PopulationConfig, lifecycle: LifecycleConfig) -> pd.DataFrame:
        n_users = population.n_users
        user_ids = [f"user_{idx:06d}" for idx in range(n_users)]
        fraud_cutoff = int(np.round(n_users * population.fraud_user_ratio))
        fraud_user_ids = set(self.rng.choice(user_ids, size=fraud_cutoff, replace=False)) if fraud_cutoff else set()

        signup_offsets = self.rng.integers(0, lifecycle.signup_window_days + 1, size=n_users)
        segments = self.rng.choice(["retail", "smb", "enterprise"], p=[0.7, 0.25, 0.05], size=n_users)

        users = pd.DataFrame(
            {
                "user_id": user_ids,
                "signup_day": signup_offsets,
                "segment": segments,
                "is_fraud": [uid in fraud_user_ids for uid in user_ids],
                "fraud_ring_id": None,
            }
        )

        if population.fraud_user_ratio and self.config.fraud_rings.enabled:
            users = self._inject_fraud_rings(users, self.config.fraud_rings)

        return users

    def _create_merchants(self, population: PopulationConfig) -> pd.DataFrame:
        n_merchants = population.n_merchants
        merchant_ids = [f"merchant_{idx:05d}" for idx in range(n_merchants)]
        categories = ["electronics", "apparel", "grocery", "marketplace", "travel", "gaming"]
        category_probs = np.array([0.18, 0.22, 0.2, 0.17, 0.13, 0.1])
        merchant_segments = self.rng.choice(categories, size=n_merchants, p=category_probs)
        risk_scores = np.clip(self.rng.normal(0.35, 0.18, size=n_merchants), 0, 1)

        merchants = pd.DataFrame(
            {
                "merchant_id": merchant_ids,
                "category": merchant_segments,
                "risk_score": risk_scores,
                "is_ring_merchant": False,
            }
        )
        return merchants

    def _assign_devices(
        self,
        users: pd.DataFrame,
        population: PopulationConfig,
        fraud_cfg: FraudRingConfig,
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        device_records: List[Dict[str, object]] = []
        edges: List[Dict[str, object]] = []
        device_index = 0

        os_choices = ["ios", "android", "windows", "macos"]
        os_probs = np.array([0.42, 0.4, 0.1, 0.08])

        def _new_device(owner: str, ring_id: Optional[str] = None) -> str:
            nonlocal device_index
            device_id = f"device_{device_index:06d}"
            device_index += 1
            device_records.append(
                {
                    "device_id": device_id,
                    "os": self.rng.choice(os_choices, p=os_probs),
                    "trust_score": float(np.clip(self.rng.normal(0.6, 0.15), 0, 1)),
                    "ring_id": ring_id,
                }
            )
            edges.append(
                {
                    "user_id": owner,
                    "device_id": device_id,
                    "relation": "uses",
                    "ring_id": ring_id,
                }
            )
            return device_id

        # Non ring users get devices first
        for user_row in users.itertuples():
            if user_row.fraud_ring_id:
                continue
            device_count = max(1, self.rng.poisson(population.avg_devices_per_user))
            for _ in range(device_count):
                _new_device(user_row.user_id)

        # Fraud ring participants share devices to create the motif
        if fraud_cfg.enabled:
            grouped = users.dropna(subset=["fraud_ring_id"]).groupby("fraud_ring_id")
            for ring_id, group in grouped:
                ring_size = len(group)
                shared_count = max(1, int(np.ceil(population.avg_devices_per_user * fraud_cfg.shared_device_ratio)))
                first_member = group.user_id.iloc[0]
                shared_devices = [
                    _new_device(owner=first_member, ring_id=ring_id) for _ in range(shared_count)
                ]
                for member in group.itertuples():
                    # add shared edges for all members
                    for device_id in shared_devices:
                        if member.user_id == first_member:
                            continue
                        edges.append(
                            {
                                "user_id": member.user_id,
                                "device_id": device_id,
                                "relation": "uses",
                                "ring_id": ring_id,
                            }
                        )
                    personal_device_count = max(
                        0,
                        int(np.round(population.avg_devices_per_user)) - shared_count,
                    )
                    for _ in range(personal_device_count):
                        _new_device(member.user_id, ring_id=ring_id)

        devices_df = pd.DataFrame(device_records)
        edges_df = pd.DataFrame(edges)
        return devices_df, edges_df

    def _assign_merchants(
        self,
        users: pd.DataFrame,
        merchants: pd.DataFrame,
        population: PopulationConfig,
        fraud_cfg: FraudRingConfig,
    ) -> Dict[str, List[str]]:
        merchant_links: Dict[str, List[str]] = {uid: [] for uid in users.user_id}

        base_merchants = merchants[~merchants["is_ring_merchant"]].merchant_id.tolist()

        for user_row in users.itertuples():
            merchant_count = max(1, self.rng.poisson(population.avg_merchants_per_user))
            merchant_count = min(merchant_count, len(base_merchants))
            chosen = self.rng.choice(base_merchants, size=merchant_count, replace=False)
            merchant_links[user_row.user_id] = list(chosen)

        if fraud_cfg.enabled:
            ring_groups = users.dropna(subset=["fraud_ring_id"]).groupby("fraud_ring_id")
            for ring_id, group in ring_groups:
                shared_count = max(1, int(np.ceil(population.avg_merchants_per_user * fraud_cfg.shared_merchant_ratio)))
                shared_merchants = [
                    f"merchant_ring_{ring_id}_{idx}"
                    for idx in range(shared_count)
                ]
                # Append shared merchants to merchant table
                for merch_id in shared_merchants:
                    merchants.loc[len(merchants)] = {
                        "merchant_id": merch_id,
                        "category": "ring-front",
                        "risk_score": float(np.clip(self.rng.normal(0.85, 0.05), 0, 1)),
                        "is_ring_merchant": True,
                    }

                for member in group.itertuples():
                    merchant_links[member.user_id].extend(shared_merchants)

        return merchant_links

    def _build_lifecycles(self, users: pd.DataFrame, lifecycle: LifecycleConfig) -> pd.DataFrame:
        lifecycle_records: List[Dict[str, object]] = []
        horizon = lifecycle.horizon_days

        for user_row in users.itertuples():
            active_start = int(user_row.signup_day)
            span = max(1, int(np.round(self.rng.normal(lifecycle.mean_active_span_days, lifecycle.std_active_span_days))))
            active_end = min(horizon, active_start + span)
            lifecycle_records.append(
                {
                    "user_id": user_row.user_id,
                    "period_index": 0,
                    "start_day": active_start,
                    "end_day": active_end,
                }
            )

            if self.rng.random() < lifecycle.churn_reactivation_probability and active_end < horizon:
                rest_days = self.rng.integers(3, 14)
                restart_day = min(horizon, active_end + rest_days)
                re_span = max(1, int(np.round(self.rng.normal(lifecycle.mean_active_span_days / 2, lifecycle.std_active_span_days / 2))))
                lifecycle_records.append(
                    {
                        "user_id": user_row.user_id,
                        "period_index": 1,
                        "start_day": restart_day,
                        "end_day": min(horizon, restart_day + re_span),
                    }
                )

        return pd.DataFrame(lifecycle_records)

    def _generate_events(
        self,
        users: pd.DataFrame,
        lifecycles: pd.DataFrame,
        merchant_links: Dict[str, List[str]],
        events_cfg: EventConfig,
    ) -> pd.DataFrame:
        event_records: List[Dict[str, object]] = []
        event_id = 0
        anchor = datetime.combine(self.config.anchor_date, datetime.min.time())

        drift_index = self._create_drift_index(self.config.drift_scenarios)

        for user_row in users.itertuples():
            # Signup event
            signup_timestamp = anchor + timedelta(days=int(user_row.signup_day), hours=float(self.rng.uniform(0, 24)))
            event_records.append(
                {
                    "event_id": event_id,
                    "event_type": "signup",
                    "user_id": user_row.user_id,
                    "related_id": None,
                    "timestamp": signup_timestamp,
                    "amount": None,
                    "is_fraud": bool(user_row.is_fraud),
                    "drift_tag": None,
                }
            )
            event_id += 1

            user_periods = lifecycles[lifecycles.user_id == user_row.user_id]
            for period in user_periods.itertuples():
                for day in range(period.start_day, period.end_day + 1):
                    multipliers = drift_index.get(day, {})
                    drift_tag = multipliers.get("tag")
                    rate_multiplier = multipliers.get("fraud_multiplier" if user_row.is_fraud else "legit_multiplier", 1.0)
                    chargeback_multiplier = multipliers.get("chargeback_multiplier", 1.0)

                    base_rate = events_cfg.daily_txn_rate_fraud if user_row.is_fraud else events_cfg.daily_txn_rate_legit
                    txn_count = self.rng.poisson(max(base_rate * rate_multiplier, 0))
                    if txn_count == 0:
                        continue

                    chargeback_prob = np.clip(
                        (events_cfg.chargeback_prob_fraud if user_row.is_fraud else events_cfg.chargeback_prob_legit)
                        * chargeback_multiplier,
                        0,
                        1,
                    )

                    user_merchants = merchant_links[user_row.user_id]
                    for _ in range(txn_count):
                        merchant_id = self.rng.choice(user_merchants)
                        amount = max(
                            1.0,
                            float(
                                self.rng.normal(events_cfg.base_amount, events_cfg.amount_std)
                                * (1.05 if user_row.is_fraud else 1.0)
                                * rate_multiplier
                            ),
                        )
                        timestamp = anchor + timedelta(
                            days=day,
                            hours=float(self.rng.uniform(0, 24)),
                            minutes=float(self.rng.uniform(0, 60)),
                        )
                        txn_event_id = event_id
                        event_records.append(
                            {
                                "event_id": txn_event_id,
                                "event_type": "transaction",
                                "user_id": user_row.user_id,
                                "related_id": merchant_id,
                                "timestamp": timestamp,
                                "amount": amount,
                                "is_fraud": bool(user_row.is_fraud),
                                "drift_tag": drift_tag,
                            }
                        )
                        event_id += 1

                        if self.rng.random() < chargeback_prob:
                            chargeback_timestamp = timestamp + timedelta(days=float(self.rng.uniform(3, 30)))
                            event_records.append(
                                {
                                    "event_id": event_id,
                                    "event_type": "chargeback",
                                    "user_id": user_row.user_id,
                                    "related_id": txn_event_id,
                                    "timestamp": chargeback_timestamp,
                                    "amount": -amount,
                                    "is_fraud": bool(user_row.is_fraud),
                                    "drift_tag": drift_tag,
                                }
                            )
                            event_id += 1

        events_df = pd.DataFrame(event_records)
        return events_df.sort_values("timestamp").reset_index(drop=True)

    def _build_graph(
        self,
        users: pd.DataFrame,
        devices: pd.DataFrame,
        merchants: pd.DataFrame,
        device_edges: pd.DataFrame,
        events: pd.DataFrame,
    ) -> nx.MultiDiGraph:
        graph = nx.MultiDiGraph()

        for row in users.itertuples():
            graph.add_node(
                row.user_id,
                type="user",
                segment=row.segment,
                is_fraud=bool(row.is_fraud),
                signup_day=int(row.signup_day),
                fraud_ring_id=row.fraud_ring_id,
            )

        for row in devices.itertuples():
            graph.add_node(
                row.device_id,
                type="device",
                os=row.os,
                trust_score=float(row.trust_score),
                ring_id=row.ring_id,
            )

        for row in merchants.itertuples():
            graph.add_node(
                row.merchant_id,
                type="merchant",
                category=row.category,
                risk_score=float(row.risk_score),
                is_ring_merchant=bool(row.is_ring_merchant),
            )

        for edge in device_edges.itertuples():
            graph.add_edge(edge.user_id, edge.device_id, relation=edge.relation, ring_id=edge.ring_id)

        txn_events = events[events.event_type == "transaction"]
        txn_counts = txn_events.groupby(["user_id", "related_id"]).size().reset_index(name="txn_count")
        for row in txn_counts.itertuples():
            graph.add_edge(row.user_id, row.related_id, relation="transacts_with", weight=int(row.txn_count))

        return graph

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _inject_fraud_rings(self, users: pd.DataFrame, fraud_cfg: FraudRingConfig) -> pd.DataFrame:
        fraud_users = users[users.is_fraud]
        available_users = fraud_users.user_id.tolist()
        if not available_users:
            return users

        ring_assignments: Dict[str, str] = {}
        ring_counter = 0

        while available_users and ring_counter < fraud_cfg.ring_count:
            ring_size = min(
                len(available_users),
                self.rng.integers(fraud_cfg.min_ring_size, fraud_cfg.max_ring_size + 1),
            )
            if ring_size < fraud_cfg.min_ring_size:
                break
            selected = list(self.rng.choice(available_users, size=ring_size, replace=False))
            ring_id = f"ring_{ring_counter:03d}"
            for uid in selected:
                ring_assignments[uid] = ring_id
                available_users.remove(uid)
            ring_counter += 1

        users = users.copy()
        users["fraud_ring_id"] = users.user_id.map(ring_assignments)
        users["fraud_ring_id"] = users["fraud_ring_id"].where(users["fraud_ring_id"].notna(), None)
        return users

    def _create_drift_index(self, scenarios: Iterable[DriftScenario]) -> Dict[int, Dict[str, object]]:
        drift_index: Dict[int, Dict[str, object]] = {}
        for scenario in scenarios:
            for day in scenario.to_range():
                entry = drift_index.setdefault(day, {"tags": set()})
                entry["tags"].add(scenario.name)
                entry["fraud_multiplier"] = entry.get("fraud_multiplier", 1.0) * scenario.fraud_multiplier
                entry["legit_multiplier"] = entry.get("legit_multiplier", 1.0) * scenario.legit_multiplier
                entry["chargeback_multiplier"] = entry.get("chargeback_multiplier", 1.0) * scenario.chargeback_multiplier

        for day, entry in drift_index.items():
            if entry["tags"]:
                entry["tag"] = "|".join(sorted(entry["tags"]))
            else:
                entry["tag"] = None
        return drift_index


__all__ = ["SyntheticEntityGraphForge", "GenerationResult"]
