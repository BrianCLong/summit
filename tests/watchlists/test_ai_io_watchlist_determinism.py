import json
import os
import sys
import unittest

from scripts.watchlists.build_ai_io_watchlist import build_watchlist


class TestAIIOWatchlistDeterminism(unittest.TestCase):
    def test_determinism(self):
        watchlist1 = build_watchlist()
        watchlist2 = build_watchlist()

        json1 = json.dumps(watchlist1, sort_keys=True)
        json2 = json.dumps(watchlist2, sort_keys=True)

        self.assertEqual(json1, json2)

        # Verify deterministic output IDs
        for cat in ["research_programs", "bot_infra_trends", "detection_methods"]:
            for i, item in enumerate(watchlist1[cat]):
                self.assertEqual(item["evidence_id"], watchlist2[cat][i]["evidence_id"])

if __name__ == '__main__':
    unittest.main()
