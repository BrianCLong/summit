import json
import os
import sys

class AnswerCompletenessEvaluator:
    def __init__(self, fixtures_path):
        self.fixtures_path = fixtures_path

    def evaluate(self):
        results = []
        if not os.path.exists(self.fixtures_path):
            print(f"Error: Fixtures file not found at {self.fixtures_path}")
            return results

        with open(self.fixtures_path, 'r') as f:
            for line in f:
                if not line.strip():
                    continue
                case = json.loads(line)
                score = self.calculate_completeness(case)
                case['completeness_score'] = score['total']
                case['omission_rate'] = score['omission_rate']
                case['metrics'] = score['breakdown']
                results.append(case)
        return results

    def calculate_completeness(self, case):
        answer = case.get('answer', '').lower()
        expected_entities = case.get('expected_entities', [])
        sub_questions = case.get('sub_questions', [])
        context_reqs = case.get('context_requirements', [])
        rel_reqs = case.get('relationship_requirements', [])

        # 1. Entity Coverage
        entity_hits = sum(1 for e in expected_entities if e.lower() in answer)
        entity_score = entity_hits / max(1, len(expected_entities))

        # 2. Sub-question Addressing
        subq_hits = sum(1 for q in sub_questions if any(keyword.lower() in answer for keyword in q.get('keywords', [])))
        subq_score = subq_hits / max(1, len(sub_questions))

        # 3. Critical Context Preservation
        context_hits = sum(1 for c in context_reqs if c.lower() in answer)
        context_score = context_hits / max(1, len(context_reqs))

        # 4. Length Calibration
        query_len = len(case.get('query', ''))
        answer_len = len(case.get('answer', ''))
        length_score = 1.0 if (answer_len > query_len * 0.5) else (answer_len / (query_len * 0.5 + 1e-6))

        # 5. Relationship Surfacing
        # Heuristic: check if both entities in the relationship are present
        rel_hits = 0
        for rel in rel_reqs:
            if rel['source'].lower() in answer and rel['target'].lower() in answer:
                rel_hits += 1
        rel_score = rel_hits / max(1, len(rel_reqs))

        # Weighted Total Score
        total = (entity_score * 0.2 +
                 subq_score * 0.3 +
                 context_score * 0.2 +
                 length_score * 0.1 +
                 rel_score * 0.2)

        # Omission Rate: fraction of total requirements (entities + subq + context) missed
        total_reqs = len(expected_entities) + len(sub_questions) + len(context_reqs)
        total_missed = (len(expected_entities) - entity_hits) + \
                       (len(sub_questions) - subq_hits) + \
                       (len(context_reqs) - context_hits)
        omission_rate = total_missed / max(1, total_reqs)

        return {
            'total': round(total, 2),
            'omission_rate': round(omission_rate, 2),
            'breakdown': {
                'entity_coverage': round(entity_score, 2),
                'subquestion_addressing': round(subq_score, 2),
                'context_preservation': round(context_score, 2),
                'length_calibration': round(length_score, 2),
                'relationship_surfacing': round(rel_score, 2)
            }
        }

if __name__ == "__main__":
    fixtures = "evals/fixtures/answer-completeness/fixtures.jsonl"
    evaluator = AnswerCompletenessEvaluator(fixtures)
    results = evaluator.evaluate()
    print(json.dumps(results, indent=2))
