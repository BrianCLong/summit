---
name: 'Issue #3: Entity Resolution Accuracy Drop on Noisy Input'
about: Improve AI-based entity resolution for noisy data
title: 'Issue #3: Entity Resolution Accuracy Drop on Noisy Input'
labels: 'bug, ai, ml, data-quality'
assignees: ''
---

**Branch**: `feature/er-noise-robustness`

**Status**: Open

**Description**
The AI-based entity resolution (ER) module misclassifies approximately 15% of near-duplicate entities when input data is noisy (e.g., OCR'd names, alternate spellings, inconsistent formatting). This leads to fragmented graph views where a single real-world entity appears as multiple distinct nodes, hindering accurate analysis and insights.

**Proposed Solution**
Enhance the ER pipeline by incorporating pre-processing steps for noise reduction (e.g., fuzzy matching, phonetic algorithms, normalization), and potentially fine-tuning the underlying AI model with more diverse and noisy training data.

**Code/File Layout**

```
ml/
  entity_resolution/
    preprocessors.py
    er_model.py
    er_pipeline.py
tests/
  ml/
    test_er_accuracy.py
```

**Python Stub (`preprocessors.py`):**

```python
# ml/entity_resolution/preprocessors.py
import re
from fuzzywuzzy import fuzz # Requires `pip install fuzzywuzzy python-Levenshtein`
from jellyfish import metaphone # Requires `pip install jellyfish`

def normalize_text(text: str) -> str:
    """Converts text to lowercase, removes extra whitespace, and common punctuation."""
    text = text.lower()
    text = re.sub(r'\s+', ' ', text).strip() # Replace multiple spaces with single
    text = re.sub(r'[^\w\s]', '', text) # Remove non-alphanumeric except spaces
    return text

def phonetic_hash(text: str) -> str:
    """Generates a phonetic hash (e.g., Metaphone) for a given text."""
    return metaphone(text)

def fuzzy_match_score(s1: str, s2: str) -> int:
    """Calculates a fuzzy matching score between two strings (0-100)."""
    return fuzz.ratio(s1, s2)

# Example usage in er_pipeline.py
# from .preprocessors import normalize_text, phonetic_hash, fuzzy_match_score

# def process_entity_name(name):
#     normalized_name = normalize_text(name)
#     phonetic_code = phonetic_hash(normalized_name)
#     return normalized_name, phonetic_code

# def compare_entities(entity1, entity2):
#     score = fuzzy_match_score(entity1.normalized_name, entity2.normalized_name)
#     if entity1.phonetic_code == entity2.phonetic_code:
#         score += 10 # Boost if phonetic match
#     return score
```

**Python Stub (`er_pipeline.py` - Simplified):**

```python
# ml/entity_resolution/er_pipeline.py
from typing import List, Dict
from .preprocessors import normalize_text, phonetic_hash, fuzzy_match_score
# from .er_model import EntityResolutionModel # Assuming an ML model

class Entity:
    def __init__(self, id: str, name: str, properties: Dict):
        self.id = id
        self.name = name
        self.properties = properties
        self.normalized_name = normalize_text(name)
        self.phonetic_code = phonetic_hash(self.normalized_name)

def resolve_entities(new_entity_data: Dict, existing_entities: List[Entity], threshold: int = 85) -> str:
    """
    Attempts to resolve a new entity against existing ones.
    Returns the ID of a matched existing entity, or None if no match.
    """
    new_entity = Entity(id="temp", name=new_entity_data.get("name", ""), properties=new_entity_data)

    best_match_id = None
    highest_score = 0

    for existing_entity in existing_entities:
        score = fuzzy_match_score(new_entity.normalized_name, existing_entity.normalized_name)

        # Add phonetic boost
        if new_entity.phonetic_code == existing_entity.phonetic_code:
            score += 10 # Arbitrary boost

        # Consider other properties for matching
        # Example: if 'email' property exists and matches exactly
        if new_entity.properties.get('email') and new_entity.properties['email'] == existing_entity.properties.get('email'):
            score += 20

        if score > highest_score:
            highest_score = score
            best_match_id = existing_entity.id

    if highest_score >= threshold:
        return best_match_id
    return None

# Example usage:
# existing_data = [
#     {"id": "e1", "name": "John Doe", "properties": {"email": "john.doe@example.com"}},
#     {"id": "e2", "name": "Jon Doe", "properties": {"email": "jon.doe@example.com"}},
#     {"id": "e3", "name": "Jane Smith", "properties": {}}
# ]
# existing_entity_objects = [Entity(**d) for d in existing_data]

# new_data_noisy = {"name": "Jhon Doe", "properties": {"email": "john.doe@example.com"}}
# resolved_id = resolve_entities(new_data_noisy, existing_entity_objects)
# print(f"Resolved ID for '{new_data_noisy['name']}': {resolved_id}") # Should resolve to e1
```

**Architecture Sketch (ASCII)**

```
+-------------------+
|   Raw Input Data  |
| (e.g., OCR, CSV)  |
+-------------------+
        |
        v
+-------------------+
|  Pre-processing   |
| (preprocessors.py)|
| - Normalization   |
| - Phonetic Hashing|
| - Fuzzy Matching  |
+-------------------+
        |
        v
+-------------------+
| Entity Resolution |
|    Pipeline       |
| (er_pipeline.py)  |
| - Compare with    |
|   Existing Entities|
| - Apply ML Model  |
+-------------------+
        |
        v
+-------------------+
|  Resolved Entities|
| (Cleaned Graph)   |
+-------------------+
```

**Sub-tasks:**

- [ ] Implement robust text normalization functions (lowercase, remove punctuation, handle common abbreviations) in `preprocessors.py`.
- [ ] Integrate phonetic algorithms (e.g., Metaphone, Soundex) for name matching.
- [ ] Incorporate fuzzy string matching (e.g., Levenshtein distance, Jaro-Winkler) for near-duplicate detection.
- [ ] Develop a scoring mechanism in `er_pipeline.py` that combines various pre-processed features to determine entity similarity.
- [ ] Explore and potentially integrate a machine learning model (e.g., Siamese networks, clustering algorithms) for more sophisticated entity matching, especially for complex cases.
- [ ] Curate or generate a diverse dataset of noisy entity names and their ground truth matches for training and evaluation.
- [ ] Implement comprehensive unit and integration tests (`test_er_accuracy.py`) to measure the accuracy improvement.
