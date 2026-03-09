import torch

from libs.attn_lab.bench import _quality_proxy, SuiteConfig
from libs.attn_lab.config import AttnLabConfig, AttnType
from libs.attn_lab.mhla import linear_attention, mhla_linear_attention, softmax_attention


def test_mhla_shapes_match_input():
    torch.manual_seed(0)
    batch = 2
    seq_len = 8
    dim = 16
    q = torch.randn(batch, seq_len, dim)
    k = torch.randn(batch, seq_len, dim)
    v = torch.randn(batch, seq_len, dim)

    output = mhla_linear_attention(q, k, v, num_token_heads=2)
    assert output.shape == v.shape


def test_mhla_deterministic():
    torch.manual_seed(42)
    q = torch.randn(1, 6, 8)
    k = torch.randn(1, 6, 8)
    v = torch.randn(1, 6, 8)

    out_a = mhla_linear_attention(q, k, v, num_token_heads=3)
    out_b = mhla_linear_attention(q, k, v, num_token_heads=3)

    torch.testing.assert_close(out_a, out_b)


def test_linear_attention_close_to_softmax_small():
    torch.manual_seed(9)
    q = torch.randn(1, 4, 8)
    k = torch.randn(1, 4, 8)
    v = torch.randn(1, 4, 8)

    softmax_out = softmax_attention(q, k, v, causal=False)
    linear_out = linear_attention(q, k, v, causal=False)

    assert torch.nn.functional.cosine_similarity(
        softmax_out.flatten(), linear_out.flatten(), dim=0
    ) > 0.5


def test_quality_proxy_includes_imputed_intention_metric():
    torch.manual_seed(3)
    q = torch.randn(1, 4, 8)
    k = torch.randn(1, 4, 8)
    v = torch.randn(1, 4, 8)
    output = linear_attention(q, k, v, causal=False)
    suite = SuiteConfig(
        name='unit',
        seq_len=4,
        causal=False,
        chunkwise=False,
        chunk_size=2,
    )
    config = AttnLabConfig(attn_type=AttnType.LINEAR)
    quality = _quality_proxy(config, suite, output, q, k, v)

    assert 'imputed_intention_order_23' in quality
    assert 0.0 <= quality['imputed_intention_order_23'] <= 1.0
