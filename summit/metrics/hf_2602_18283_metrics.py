import math


class HF2602Metrics:
    @staticmethod
    def hit_rate(predictions: list[list[int]], targets: list[int], k: int = 10) -> float:
        """
        Hit Rate @ K.
        Checks if the target item is in the top-K predicted items.
        Returns a float rounded to 4 decimal places.
        """
        hits = 0
        for i in range(len(targets)):
            target = targets[i]
            preds = predictions[i][:k]
            if target in preds:
                hits += 1

        return round(float(hits) / max(1, len(targets)), 4)

    @staticmethod
    def ndcg(predictions: list[list[int]], targets: list[int], k: int = 10) -> float:
        """
        Normalized Discounted Cumulative Gain @ K.
        Returns a float rounded to 4 decimal places.
        """
        score = 0.0
        for i in range(len(targets)):
            target = targets[i]
            preds = predictions[i][:k]

            if target in preds:
                rank = preds.index(target) + 1
                score += 1.0 / math.log2(rank + 1)

        return round(score / max(1, len(targets)), 4)
