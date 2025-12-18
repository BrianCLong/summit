"""
Tests for Federated Learning Core Components

Tests cover:
- Server initialization and configuration
- Client training and updates
- Differential privacy mechanisms
- Air-gap synchronization
- Model aggregation strategies
"""

import pytest
import numpy as np
import tempfile
from pathlib import Path

from ml.federated.core.flower_server import FederatedServer, ServerConfig
from ml.federated.core.flower_client import FederatedClient, ClientConfig, PrivacyAccountant
from ml.federated.core.strategies import OSINTFedAvg, PrivacyPreservingStrategy
from ml.federated.core.model_registry import ModelRegistry, ModelVersion
from ml.federated.privacy.pgvector_dp import PgVectorDifferentialPrivacy, PrivacyConfig
from ml.federated.privacy.secure_aggregation import SecureAggregator
from ml.federated.privacy.privacy_accountant import RenyiDPAccountant
from ml.federated.aggregation.graph_merger import GraphMerger, MergeStrategy
from ml.federated.sync.merkle_verification import MerkleTree, verify_merkle_proof
from ml.federated.osint.osint_model import OSINTClassifier, OSINTEmbedder
from ml.federated.osint.data_loader import OSINTDataLoader, OSINTDataset


class TestServerConfig:
    """Tests for server configuration"""

    def test_default_config(self):
        config = ServerConfig()
        assert config.num_rounds == 10
        assert config.min_fit_clients == 2
        assert config.enable_differential_privacy is True

    def test_custom_config(self):
        config = ServerConfig(
            num_rounds=20,
            min_fit_clients=5,
            privacy_epsilon=0.5,
            airgap_mode=True,
        )
        assert config.num_rounds == 20
        assert config.min_fit_clients == 5
        assert config.privacy_epsilon == 0.5
        assert config.airgap_mode is True


class TestFederatedServer:
    """Tests for federated server"""

    def test_server_initialization(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ServerConfig(
                model_save_path=tmpdir,
                airgap_export_path=f"{tmpdir}/export",
                airgap_import_path=f"{tmpdir}/import",
            )
            server = FederatedServer(config)
            assert server.current_round == 0
            assert server.privacy_budget_remaining == config.privacy_epsilon

    def test_node_registration(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ServerConfig(model_save_path=tmpdir)
            server = FederatedServer(config)

            result = server.register_node(
                "node_1",
                {"gpu": True, "memory": 8192},
                is_airgapped=False,
            )
            assert result is True
            assert "node_1" in server.get_registered_nodes()

    def test_training_status(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ServerConfig(model_save_path=tmpdir)
            server = FederatedServer(config)

            status = server.get_training_status()
            assert status["current_round"] == 0
            assert status["airgap_mode"] is False


class TestFederatedClient:
    """Tests for federated client"""

    def test_client_initialization(self):
        config = ClientConfig(
            node_id="test_node",
            server_address="localhost:8080",
        )
        client = FederatedClient(config)
        assert client.config.node_id == "test_node"

    def test_client_properties(self):
        config = ClientConfig(
            node_id="test_node",
            node_region="us-west",
            node_jurisdiction="US",
        )
        client = FederatedClient(config)
        props = client.get_properties({})

        assert props["node_id"] == "test_node"
        assert props["node_region"] == "us-west"

    def test_privacy_accountant(self):
        accountant = PrivacyAccountant(epsilon=1.0, delta=1e-5)
        assert accountant.get_remaining() == 1.0

        accountant.spend(0.1, 1e-6)
        assert accountant.get_spent() == 0.1
        assert accountant.get_remaining() == 0.9


class TestDifferentialPrivacy:
    """Tests for differential privacy"""

    def test_noise_addition(self):
        config = PrivacyConfig(epsilon=1.0, delta=1e-5)
        dp = PgVectorDifferentialPrivacy(config)

        embedding = np.random.randn(768)
        noised, epsilon_used = dp.add_noise_to_embedding(embedding)

        assert noised.shape == embedding.shape
        assert epsilon_used > 0
        # Noised should be different from original
        assert not np.allclose(embedding, noised)

    def test_embedding_aggregation(self):
        config = PrivacyConfig(epsilon=1.0, delta=1e-5, min_aggregation_count=3)
        dp = PgVectorDifferentialPrivacy(config)

        embeddings = [np.random.randn(768) for _ in range(5)]
        aggregated, epsilon = dp.aggregate_embeddings_private(embeddings)

        assert aggregated.shape == (768,)
        assert epsilon > 0

    def test_privacy_budget_tracking(self):
        config = PrivacyConfig(epsilon=1.0, delta=1e-5)
        dp = PgVectorDifferentialPrivacy(config)

        embedding = np.random.randn(768)
        dp.add_noise_to_embedding(embedding, epsilon=0.5)

        report = dp.get_privacy_report()
        assert report["usage"]["epsilon_spent"] == 0.5
        assert report["usage"]["epsilon_remaining"] == 0.5


class TestSecureAggregation:
    """Tests for secure aggregation"""

    def test_secret_sharing(self):
        aggregator = SecureAggregator(threshold=3)
        secret = np.array([1.0, 2.0, 3.0, 4.0])

        shares = aggregator.create_shares(secret, "node_1", num_shares=5)
        assert len(shares) == 5
        assert all(s.threshold == 3 for s in shares)

    def test_pairwise_masking(self):
        aggregator = SecureAggregator()

        updates = {
            "node_1": np.array([1.0, 2.0, 3.0]),
            "node_2": np.array([4.0, 5.0, 6.0]),
            "node_3": np.array([7.0, 8.0, 9.0]),
        }

        aggregated = aggregator.pairwise_masking_aggregate(updates)

        # Should be close to mean
        expected = np.mean(list(updates.values()), axis=0)
        np.testing.assert_array_almost_equal(aggregated, expected)


class TestRenyiDPAccountant:
    """Tests for Rényi DP accountant"""

    def test_accountant_initialization(self):
        accountant = RenyiDPAccountant(total_epsilon=1.0, total_delta=1e-5)
        assert accountant.total_epsilon == 1.0
        assert not accountant.is_budget_exhausted()

    def test_privacy_tracking(self):
        accountant = RenyiDPAccountant(total_epsilon=10.0, total_delta=1e-5)

        # Record multiple steps
        for _ in range(5):
            accountant.record_step(noise_multiplier=1.0, sample_rate=0.01)

        epsilon = accountant.get_epsilon(1e-5)
        assert epsilon > 0
        assert epsilon < 10.0  # Should not exhaust budget

    def test_noise_multiplier_computation(self):
        accountant = RenyiDPAccountant(total_epsilon=1.0, total_delta=1e-5)

        noise_mult = accountant.compute_noise_multiplier_for_budget(
            target_epsilon=1.0,
            num_steps=100,
            sample_rate=0.01,
        )
        assert noise_mult > 0


class TestGraphMerger:
    """Tests for graph merging"""

    def test_union_merge(self):
        merger = GraphMerger(strategy=MergeStrategy.UNION)

        graphs = [
            {
                "nodes": [{"id": "a", "type": "person", "confidence": 0.9}],
                "edges": [],
            },
            {
                "nodes": [{"id": "b", "type": "org", "confidence": 0.8}],
                "edges": [],
            },
        ]

        merged = merger.merge_graphs(graphs, ["node_1", "node_2"])
        assert len(merged["nodes"]) == 2

    def test_consensus_merge(self):
        merger = GraphMerger(
            strategy=MergeStrategy.CONSENSUS,
            consensus_threshold=2,
        )

        # Same node from multiple sources
        graphs = [
            {"nodes": [{"id": "a", "type": "person", "confidence": 0.9}], "edges": []},
            {"nodes": [{"id": "a", "type": "person", "confidence": 0.8}], "edges": []},
            {"nodes": [{"id": "b", "type": "org", "confidence": 0.7}], "edges": []},
        ]

        merged = merger.merge_graphs(graphs, ["n1", "n2", "n3"])
        # Only 'a' meets consensus threshold
        assert len(merged["nodes"]) == 1
        assert merged["nodes"][0]["id"] == "a"


class TestMerkleTree:
    """Tests for Merkle tree verification"""

    def test_merkle_root(self):
        data = ["block1", "block2", "block3", "block4"]
        tree = MerkleTree(data)

        root = tree.get_root()
        assert len(root) == 64  # SHA256 hex

    def test_merkle_proof_verification(self):
        data = ["block1", "block2", "block3", "block4"]
        tree = MerkleTree(data)

        proof = tree.get_proof(0)
        root = tree.get_root()

        assert verify_merkle_proof("block1", proof, root)

    def test_invalid_proof_fails(self):
        data = ["block1", "block2", "block3", "block4"]
        tree = MerkleTree(data)

        proof = tree.get_proof(0)
        root = tree.get_root()

        # Tampered data should fail
        assert not verify_merkle_proof("tampered", proof, root)


class TestOSINTModels:
    """Tests for OSINT models"""

    def test_classifier_forward(self):
        classifier = OSINTClassifier(num_classes=10, embedding_dim=768)
        x = np.random.randn(32, 768)

        probs = classifier.forward(x)
        assert probs.shape == (32, 10)
        np.testing.assert_array_almost_equal(probs.sum(axis=1), np.ones(32))

    def test_classifier_predict(self):
        classifier = OSINTClassifier(num_classes=10)
        x = np.random.randn(5, 768)

        classes, confidences = classifier.predict(x)
        assert classes.shape == (5,)
        assert confidences.shape == (5,)
        assert all(0 <= c <= 1 for c in confidences)

    def test_embedder(self):
        embedder = OSINTEmbedder(input_dim=768, output_dim=256)
        x = np.random.randn(10, 768)

        embeddings = embedder.embed(x)
        assert embeddings.shape == (10, 256)

        # Should be normalized
        norms = np.linalg.norm(embeddings, axis=1)
        np.testing.assert_array_almost_equal(norms, np.ones(10))


class TestOSINTDataLoader:
    """Tests for OSINT data loading"""

    def test_synthetic_data_generation(self):
        dataset = OSINTDataLoader.generate_synthetic_data(
            num_samples=100,
            num_classes=5,
        )
        assert len(dataset) == 100

    def test_data_loader_iteration(self):
        dataset = OSINTDataLoader.generate_synthetic_data(num_samples=100)
        loader = OSINTDataLoader(dataset, batch_size=32)

        batches = list(loader)
        assert len(batches) == 4  # ceil(100/32)

        features, labels = batches[0]
        assert features.shape[0] == 32
        assert labels.shape[0] == 32

    def test_dataset_split(self):
        dataset = OSINTDataLoader.generate_synthetic_data(num_samples=100)
        train, test = dataset.split(ratio=0.8)

        assert len(train) == 80
        assert len(test) == 20


class TestModelRegistry:
    """Tests for model registry"""

    def test_register_model(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            registry = ModelRegistry(storage_path=tmpdir)

            params = np.random.randn(100, 768)
            version = registry.register_model(
                parameters=params,
                round_number=1,
                metrics={"accuracy": 0.85, "loss": 0.3},
                node_contributions=["node_1", "node_2"],
                privacy_budget_used=0.1,
            )

            assert version.round_number == 1
            assert version.metrics["accuracy"] == 0.85

    def test_get_latest_version(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            registry = ModelRegistry(storage_path=tmpdir)

            for i in range(3):
                registry.register_model(
                    parameters=np.random.randn(100),
                    round_number=i + 1,
                    metrics={"accuracy": 0.7 + i * 0.05},
                    node_contributions=["node_1"],
                    privacy_budget_used=0.1,
                )

            latest = registry.get_latest_version()
            assert latest.round_number == 3

    def test_export_import_airgap(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            registry = ModelRegistry(storage_path=tmpdir)

            params = np.random.randn(100, 768)
            version = registry.register_model(
                parameters=params,
                round_number=1,
                metrics={"accuracy": 0.85},
                node_contributions=["node_1"],
                privacy_budget_used=0.1,
            )

            # Export
            export_path = registry.export_for_airgap(version.version_id, tmpdir)
            assert Path(export_path).exists()

            # Import to new registry
            registry2 = ModelRegistry(storage_path=f"{tmpdir}/registry2")
            imported = registry2.import_from_airgap(export_path)

            assert imported.round_number == 1
            assert imported.metrics["accuracy"] == 0.85


class TestIntegration:
    """Integration tests"""

    def test_end_to_end_training_simulation(self):
        """Simulate a complete federated training round"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create server config
            server_config = ServerConfig(
                num_rounds=2,
                min_fit_clients=2,
                model_save_path=tmpdir,
                enable_differential_privacy=True,
                privacy_epsilon=1.0,
            )
            server = FederatedServer(server_config)

            # Register nodes
            server.register_node("node_1", {"gpu": False})
            server.register_node("node_2", {"gpu": False})

            # Create clients
            clients = []
            for i in range(2):
                client_config = ClientConfig(
                    node_id=f"node_{i+1}",
                    enable_local_dp=True,
                )
                client = FederatedClient(client_config)
                clients.append(client)

            # Verify setup
            assert len(server.get_registered_nodes()) == 2
            assert all(c.config.enable_local_dp for c in clients)

    def test_privacy_budget_enforcement(self):
        """Test that privacy budget is properly enforced"""
        config = PrivacyConfig(epsilon=0.5, delta=1e-5)
        dp = PgVectorDifferentialPrivacy(config)

        # Spend budget
        embedding = np.random.randn(768)
        dp.add_noise_to_embedding(embedding, epsilon=0.5)

        # Should not be able to afford more
        assert not dp.can_afford_operation(0.1)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
