from typing import List, Tuple

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]

class SpoofDetector:
    def __init__(self, protected_domains: List[str]):
        self.protected_domains = protected_domains

    def check_domain(self, domain: str) -> List[Tuple[str, float]]:
        """
        Checks a domain against protected domains.
        Returns a list of (matched_domain, confidence) tuples.
        """
        matches = []
        for protected in self.protected_domains:
            dist = levenshtein_distance(domain, protected)

            if dist == 0:
                matches.append((protected, 1.0))
            # Simple heuristic: if distance is small but not 0, it's a potential spoof
            elif 0 < dist <= 3: # Allow up to 3 edits
                confidence = 1.0 - (dist / max(len(domain), len(protected)))
                matches.append((protected, confidence))
            elif protected in domain and domain != protected:
                 # Subdomain or superstring match
                 matches.append((protected, 0.8))

        return matches

    def check_content(self, html_content: str, keywords: List[str]) -> float:
        """
        Checks content for keywords associated with protected brands.
        Returns a score between 0.0 and 1.0.
        """
        matches = 0
        for keyword in keywords:
            if keyword in html_content:
                matches += 1

        return min(matches / len(keywords), 1.0) if keywords else 0.0
