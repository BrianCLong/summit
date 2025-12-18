mock_deep_web_findings = [
    {
        "id": "dw-001",
        "type": "Forum Post",
        "source": "DarkForum",
        "language": "Russian",
        "translated_content": "We are selling a database of 1.5 million user credentials from a major e-commerce platform. The price is 2 BTC.",
        "author": "shadow_hacker",
        "timestamp": "2025-11-20T10:00:00.000Z",
        "actors": ["shadow_hacker"],
        "indicators": ["1.5 million user credentials", "2 BTC"]
    },
    {
        "id": "dw-002",
        "type": "Stolen Credentials",
        "source": "BreachedDB",
        "language": "English",
        "content": "email:user@example.com, password_hash:...",
        "timestamp": "2025-11-19T14:30:00.000Z",
        "actors": [],
        "indicators": ["user@example.com"]
    },
    {
        "id": "dw-003",
        "type": "Marketplace Listing",
        "source": "BlackMarket",
        "language": "Chinese",
        "translated_content": "Zero-day exploit for a popular web browser. Price: 50 BTC.",
        "timestamp": "2025-11-18T22:00:00.000Z",
        "actors": ["apt_group_x"],
        "indicators": ["zero-day exploit", "50 BTC"]
    }
]
