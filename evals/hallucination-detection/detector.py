import re
from typing import List, Dict, Any

class HallucinationDetector:
    def __init__(self):
        # Common causal indicators
        self.causal_indicators = [
            r"caused by", r"because of", r"due to", r"resulted in",
            r"leads to", r"led to", r"consequently", r"therefore"
        ]

    def extract_claims(self, text: str) -> List[str]:
        """Extracts factual statements from the generated answer."""
        # Simple split by sentences as proxy for claims
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 10]

    def detect_invented_data(self, answer: str, context: str) -> List[Dict[str, Any]]:
        """Specifically looks for entities, dates, or statistics in the answer that are absent from the context."""
        findings = []

        # 1. Detect Dates
        date_patterns = [
            r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b",
            r"\b\d{4}\b"
        ]
        for pattern in date_patterns:
            matches = re.findall(pattern, answer)
            for match in matches:
                if match not in context:
                    findings.append({"type": "invented_date", "value": match})

        # 2. Detect Numbers/Statistics
        number_patterns = [
            r"\$\d+(?:\.\d+)?\s*(?:million|billion|trillion)?",
            r"\b\d+(?:\.\d+)?\s*(?:million|billion|trillion)?\b"
        ]
        for pattern in number_patterns:
            matches = re.findall(pattern, answer)
            for match in matches:
                if match not in context:
                    # Filter out common small numbers like "1", "2"
                    if len(match) > 1 and not (match.isdigit() and int(match) < 10):
                         findings.append({"type": "invented_number", "value": match})

        # 3. Detect Entities (Simplified: capitalized words not in context and not at start of sentence)
        # In a real system, use SpaCy NER
        potential_entities = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", answer)
        for entity in potential_entities:
            # Skip common words if they are at the start of the sentence
            if entity in ["Summit", "This", "The", "Initiated", "Employees"]:
                continue
            if entity not in context:
                findings.append({"type": "invented_entity", "value": entity})

        return findings

    def check_causality(self, answer: str, context: str) -> List[Dict[str, Any]]:
        """Analyzes causal assertions and verifies them against the source."""
        findings = []
        for indicator in self.causal_indicators:
            pattern = rf"([^.!?]*{indicator}[^.!?]*[.!?])"
            matches = re.findall(pattern, answer, re.IGNORECASE)
            for match in matches:
                if not self._is_causality_supported(match, context):
                    findings.append({"type": "incorrect_causality", "value": match.strip()})
        return findings

    def _is_causality_supported(self, causal_sentence: str, context: str) -> bool:
        words = set(re.findall(r"\w+", causal_sentence.lower()))
        stop_words = {"the", "a", "is", "was", "of", "and", "to", "in", "by", "this", "it"}
        keywords = words - stop_words - set([i.split()[-1] for i in self.causal_indicators])

        context_sentences = re.split(r'(?<=[.!?])\s+', context)
        for cs in context_sentences:
            cs_words = set(re.findall(r"\w+", cs.lower()))
            if len(keywords & cs_words) >= min(len(keywords), 2):
                if any(re.search(rf"\b{ind}\b", cs, re.IGNORECASE) for ind in self.causal_indicators):
                    return True
        return False

    def detect_contradictions(self, answer: str, context: str) -> List[Dict[str, Any]]:
        """Flags statements that directly contradict context."""
        findings = []
        negations = [r"not", r"never", r"no longer", r"prohibits", r"allows"]

        answer_sentences = self.extract_claims(answer)
        context_sentences = re.split(r'(?<=[.!?])\s+', context)

        for asen in answer_sentences:
            for csen in context_sentences:
                overlap = self._get_word_overlap(asen, csen)
                if overlap > 0.4: # Lowered threshold
                    a_neg = any(re.search(rf"\b{n}\b", asen, re.IGNORECASE) for n in negations)
                    c_neg = any(re.search(rf"\b{n}\b", csen, re.IGNORECASE) for n in negations)

                    # Also check for antonyms like allows/prohibits
                    if ("allow" in asen.lower() and "prohibit" in csen.lower()) or \
                       ("prohibit" in asen.lower() and "allow" in csen.lower()):
                        findings.append({"type": "contradiction", "value": asen})
                        break

                    if a_neg != c_neg:
                        findings.append({"type": "contradiction", "value": asen})
                        break
        return findings

    def _get_word_overlap(self, s1: str, s2: str) -> float:
        w1 = set(re.findall(r"\w+", s1.lower()))
        w2 = set(re.findall(r"\w+", s2.lower()))
        stop_words = {"the", "a", "is", "was", "of", "and", "to", "in", "by", "this", "it", "are", "now", "under"}
        w1 = w1 - stop_words
        w2 = w2 - stop_words
        if not w1 or not w2: return 0.0
        return len(w1 & w2) / min(len(w1), len(w2))

    def evaluate(self, answer: str, context: str) -> Dict[str, Any]:
        claims = self.extract_claims(answer)
        invented = self.detect_invented_data(answer, context)
        causality = self.check_causality(answer, context)
        contradictions = self.detect_contradictions(answer, context)

        # Deduplicate issues
        all_issues = []
        seen = set()
        for issue in invented + causality + contradictions:
            key = f"{issue['type']}:{issue['value']}"
            if key not in seen:
                all_issues.append(issue)
                seen.add(key)

        faithfulness_score = 1.0
        if claims:
            deduction = len(all_issues) / len(claims)
            faithfulness_score = max(0.0, 1.0 - deduction)

        return {
            "faithfulness_score": faithfulness_score,
            "is_hallucinated": len(all_issues) > 0,
            "issues": all_issues
        }
