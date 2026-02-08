import pytest
from summit.train.wideseek import calculate_reward, compute_group_advantages

def test_reward_invalid_format():
    r = calculate_reward(item_f1=1.0, is_format_valid=False, has_tool_usage=True, response_length=100)
    assert r == 0.0

def test_reward_components():
    # r_ans=0.5, r_format=0.1, r_tool=0.1, r_len=0.001*100=0.1
    # total = 0.5 + 0.1 + 0.1 - 0.1 = 0.6
    r = calculate_reward(item_f1=0.5, is_format_valid=True, has_tool_usage=True, response_length=100)
    assert abs(r - 0.6) < 1e-6

def test_group_advantages():
    rewards = [1.0, 2.0, 3.0]
    adv = compute_group_advantages(rewards)
    # Mean = 2.0, Std = sqrt((1+0+1)/3) = sqrt(0.666) = 0.816
    # (1-2)/0.816 = -1.22
    # (2-2)/0.816 = 0
    # (3-2)/0.816 = 1.22
    assert len(adv) == 3
    assert abs(adv[1]) < 1e-6
    assert adv[0] < 0
    assert adv[2] > 0
    assert abs(adv[0] + adv[2]) < 1e-6 # Symmetric
