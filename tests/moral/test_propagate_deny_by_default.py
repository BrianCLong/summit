from unittest.mock import patch

import summit.graph.hooks.moral_layer as moral_layer


def test_propagate_disabled():
    with patch.object(moral_layer, "MORAL_LAYER_ENABLED", False):
        with patch("summit.graph.hooks.moral_layer.propagate_priors") as mock_propagate:
            moral_layer.on_graph_update({})
            mock_propagate.assert_not_called()

def test_propagate_enabled():
    with patch.object(moral_layer, "MORAL_LAYER_ENABLED", True):
        with patch("summit.graph.hooks.moral_layer.propagate_priors") as mock_propagate:
            moral_layer.on_graph_update({})
            mock_propagate.assert_called_once()
