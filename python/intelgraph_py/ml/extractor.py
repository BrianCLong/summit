import logging

import networkx as nx
import spacy
from transformers import pipeline

logger = logging.getLogger(__name__)


class ContentExtractor:
    """
    Automated Entity Extraction & Relationship Mining pipeline.
    Uses Transformers for high-precision NER and spaCy for dependency-based relationship extraction.
    Supports multilingual extraction via language-specific or multilingual models.
    """

    def __init__(self, language="en", confidence_threshold=0.85):
        self.language = language
        self.confidence_threshold = confidence_threshold
        self.nlp = None
        self.ner_pipeline = None

        self._load_models(language)

    def _load_models(self, language):
        """
        Loads appropriate models for the requested language.
        """
        if language == "en":
            spacy_model_name = "en_core_web_sm"
            transformer_model_name = "dslim/bert-base-NER"
        else:
            # Multilingual fallback
            # xx_ent_wiki_sm supports NER for many languages but limited dependency parsing
            spacy_model_name = "xx_ent_wiki_sm"
            # Babelscape/wikineural-multilingual-ner supports 9 languages
            transformer_model_name = "Babelscape/wikineural-multilingual-ner"

        logger.info(f"Loading spaCy model: {spacy_model_name}")
        try:
            self.nlp = spacy.load(spacy_model_name)
        except OSError:
            logger.warning(f"spaCy model {spacy_model_name} not found. Attempting to download...")
            try:
                from spacy.cli import download

                download(spacy_model_name)
                self.nlp = spacy.load(spacy_model_name)
            except Exception as e:
                logger.error(f"Failed to download spaCy model {spacy_model_name}: {e}")
                # Fallback to blank model if download fails, so we don't crash
                # But dependency parsing will fail.
                if language == "en":
                    self.nlp = spacy.blank("en")
                else:
                    self.nlp = spacy.blank("xx")

        logger.info(f"Loading Transformer NER model: {transformer_model_name}")
        try:
            self.ner_pipeline = pipeline(
                "ner", model=transformer_model_name, aggregation_strategy="simple"
            )
        except Exception as e:
            logger.error(f"Failed to load Transformer model {transformer_model_name}: {e}")
            self.ner_pipeline = None

    def extract_entities(self, text):
        """
        Extracts entities using Transformer model and spaCy (hybrid approach).
        Returns a list of dicts with text, label, confidence, start, end.
        """
        entities = []

        # 1. Transformer Extraction (High Precision for PER, ORG, LOC)
        if self.ner_pipeline:
            try:
                results = self.ner_pipeline(text)
                for r in results:
                    score = float(r["score"])
                    if score < self.confidence_threshold:
                        continue
                    entities.append(
                        {
                            "text": r["word"].strip(),
                            "label": r["entity_group"],
                            "confidence": score,
                            "start": r["start"],
                            "end": r["end"],
                            "source": "transformer",
                        }
                    )
            except Exception as e:
                logger.error(f"Error during Transformer NER extraction: {e}")

        # 2. spaCy Extraction (Supplementary for DATE, TIME, EVENT, GPE)
        # Note: xx_ent_wiki_sm supports PER, ORG, LOC, MISC but maybe not DATE/TIME depending on version
        doc = self.nlp(text)
        for ent in doc.ents:
            # We accept more types from spaCy if they are not covered by Transformer or are specific types
            accepted_types = ["DATE", "TIME", "EVENT", "MONEY", "GPE"]
            if self.language != "en":
                # For non-English, rely more on spaCy/multilingual transformer output
                # Just take everything that isn't already found?
                accepted_types.extend(["PER", "ORG", "LOC"])

            if ent.label_ in accepted_types:
                entities.append(
                    {
                        "text": ent.text,
                        "label": ent.label_,
                        "confidence": 0.85,  # Heuristic confidence for spaCy
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "source": "spacy",
                    }
                )

        # 3. Merge and Deduplicate
        unique_entities = []
        entities.sort(key=lambda x: x.get("confidence", 0), reverse=True)

        def has_overlap(new_ent, existing_ents):
            for ex in existing_ents:
                if max(new_ent["start"], ex["start"]) < min(new_ent["end"], ex["end"]):
                    return True
            return False

        final_list = []
        for e in entities:
            if not has_overlap(e, final_list):
                final_list.append(e)

        return final_list

    def extract_relationships(self, text, entities):
        """
        Extracts relationships between provided entities using spaCy dependency parsing.
        """
        doc = self.nlp(text)
        relationships = []

        # Only attempt complex dependency parsing if the model supports it (usually English models do)
        # Multilingual 'xx' models often lack a parser.
        has_parser = self.nlp.has_pipe("parser")
        if not has_parser:
            # Fallback: Co-occurrence based extraction for languages without parser
            return self._extract_relationships_cooccurrence(doc, entities)

        # Map character offsets to tokens for easier alignment
        char_to_token = {}
        for token in doc:
            for i in range(token.idx, token.idx + len(token)):
                char_to_token[i] = token

        def get_entity_root(entity):
            start = entity["start"]
            end = entity["end"]
            span_tokens = []
            for token in doc:
                if (token.idx >= start and token.idx + len(token) <= end) or (
                    token.idx < start and token.idx + len(token) > start
                ):
                    span_tokens.append(token)

            if not span_tokens:
                t = char_to_token.get(start)
                if t:
                    return t
                return None
            return span_tokens[-1]

        for sent in doc.sents:
            sent_entities = [
                e for e in entities if e["start"] >= sent.start_char and e["end"] <= sent.end_char
            ]
            if len(sent_entities) < 2:
                continue

            # Build graph for path finding
            edges = []
            for token in sent:
                for child in token.children:
                    edges.append((token.i, child.i))
            g = nx.Graph(edges)

            # Temporal Context
            sentence_dates = [e for e in sent_entities if e["label"] == "DATE"]
            temporal_context = sentence_dates[0]["text"] if sentence_dates else None

            relational_candidates = [
                e for e in sent_entities if e["label"] not in ["DATE", "TIME", "MONEY"]
            ]

            for i in range(len(relational_candidates)):
                for j in range(i + 1, len(relational_candidates)):
                    e1 = relational_candidates[i]
                    e2 = relational_candidates[j]

                    root1 = get_entity_root(e1)
                    root2 = get_entity_root(e2)

                    if not root1 or not root2:
                        continue
                    if root1.i not in g or root2.i not in g:
                        continue

                    try:
                        path = nx.shortest_path(g, source=root1.i, target=root2.i)
                        path_tokens = [doc[idx] for idx in path]
                        verbs = [t for t in path_tokens if t.pos_ == "VERB"]

                        if verbs:
                            predicate = verbs[0]
                            rel = {
                                "source": e1["text"],
                                "target": e2["text"],
                                "type": predicate.lemma_.upper(),
                                "predicate_text": predicate.text,
                                "confidence": 0.75,
                                "evidence": sent.text.strip(),
                                "start_idx": sent.start_char,
                                "end_idx": sent.end_char,
                            }
                            if temporal_context:
                                rel["valid_time"] = temporal_context
                            relationships.append(rel)
                    except nx.NetworkXNoPath:
                        continue

        return relationships

    def _extract_relationships_cooccurrence(self, doc, entities):
        """
        Fallback relationship extraction based on sentence co-occurrence.
        Used when dependency parser is unavailable.
        """
        relationships = []
        for sent in doc.sents:
            sent_entities = [
                e for e in entities if e["start"] >= sent.start_char and e["end"] <= sent.end_char
            ]
            relational_candidates = [e for e in sent_entities if e["label"] not in ["DATE", "TIME"]]

            if len(relational_candidates) < 2:
                continue

            sentence_dates = [e for e in sent_entities if e["label"] == "DATE"]
            temporal_context = sentence_dates[0]["text"] if sentence_dates else None

            for i in range(len(relational_candidates)):
                for j in range(i + 1, len(relational_candidates)):
                    e1 = relational_candidates[i]
                    e2 = relational_candidates[j]

                    # Create a generic relationship
                    rel = {
                        "source": e1["text"],
                        "target": e2["text"],
                        "type": "RELATED_TO",  # Generic type
                        "predicate_text": "co-occurs with",
                        "confidence": 0.4,  # Low confidence for co-occurrence
                        "evidence": sent.text.strip(),
                        "start_idx": sent.start_char,
                        "end_idx": sent.end_char,
                    }
                    if temporal_context:
                        rel["valid_time"] = temporal_context
                    relationships.append(rel)
        return relationships

    def process(self, text):
        entities = self.extract_entities(text)
        relationships = self.extract_relationships(text, entities)
        return {
            "entities": entities,
            "relationships": relationships,
            "metadata": {
                "entity_count": len(entities),
                "relationship_count": len(relationships),
                "language": self.language,
            },
        }
