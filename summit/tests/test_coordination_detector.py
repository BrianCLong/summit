from summit.influence.coordination_detector import detect_coordination


def test_coordination_detector():
    events = [
        {'narrative': 'A', 'account': 'user1'},
        {'narrative': 'A', 'account': 'user2'},
        {'narrative': 'A', 'account': 'user3'},
        {'narrative': 'B', 'account': 'user4'},
    ]
    campaigns = detect_coordination(events, threshold=3)
    assert len(campaigns) == 1
    assert campaigns[0]['narrative'] == 'A'
