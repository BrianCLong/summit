import unittest

from summit_decks.optimal_rhetoric import SlideStats, score_deck


class TestOptimalRhetoric(unittest.TestCase):
    def test_empty_deck(self):
        result = score_deck([])
        self.assertEqual(result["score"], 0)
        self.assertEqual(result["reason"], "empty")

    def test_perfect_rhythm(self):
        # All slides have same word count
        slides = [SlideStats(10, 2, False), SlideStats(10, 3, True)]
        result = score_deck(slides)
        self.assertEqual(result["score"], 100.0)
        self.assertEqual(result["stdev_words"], 0.0)

    def test_variable_rhythm(self):
        slides = [SlideStats(0, 0, False), SlideStats(20, 0, False)]
        # mean=10, var=((0-10)^2 + (20-10)^2)/2 = (100+100)/2 = 100. stdev=10.
        # score = 100 - 10 = 90.
        result = score_deck(slides)
        self.assertEqual(result["score"], 90.0)
        self.assertEqual(result["stdev_words"], 10.0)

if __name__ == "__main__":
    unittest.main()
