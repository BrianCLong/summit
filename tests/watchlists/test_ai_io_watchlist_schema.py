import json
import os
import unittest
from scripts.watchlists.build_ai_io_watchlist import build_watchlist

class TestAIIOWatchlistSchema(unittest.TestCase):
    def test_schema_validity(self):
        watchlist = build_watchlist()
        self.assertIn("research_programs", watchlist)
        self.assertIn("bot_infra_trends", watchlist)
        self.assertIn("detection_methods", watchlist)

        for cat in ["research_programs", "bot_infra_trends", "detection_methods"]:
            for item in watchlist[cat]:
                self.assertIn("evidence_id", item)
                self.assertTrue(item["evidence_id"].startswith("SUMMIT-AIIO-"))
                self.assertIn("category", item)
                self.assertIn("title", item)
                self.assertIn("watch_priority", item)
                self.assertIn(item["watch_priority"], ["P1", "P2"])
                self.assertIn("why_now", item)
                self.assertIn("observable_signals", item)
                self.assertIsInstance(item["observable_signals"], list)
                self.assertIn("summit_fit", item)
                self.assertIsInstance(item["summit_fit"], list)
                self.assertIn("claim_refs", item)

if __name__ == '__main__':
    unittest.main()
