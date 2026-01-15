import json
import sys

import spacy

# Cache loaded models to avoid reloading on every request if the process stays alive
loaded_models = {}


def get_model(lang):
    # Map languages to spaCy models
    # Ideally, we would support 100+ languages here using 'xx_ent_wiki_sm' or specific models
    model_map = {
        "en": "en_core_web_sm",
        "xx": "xx_ent_wiki_sm",  # Multilingual
    }

    model_name = model_map.get(lang, "en_core_web_sm")

    if model_name in loaded_models:
        return loaded_models[model_name]

    try:
        nlp = spacy.load(model_name)
        loaded_models[model_name] = nlp
        return nlp
    except OSError:
        # Fallback or error reporting
        # For the purpose of this script, we try to download if missing or return None
        # But downloading in runtime is risky. We assume it's pre-installed.
        # Fallback to English if specific model fails?
        if model_name != "en_core_web_sm":
            try:
                nlp = spacy.load("en_core_web_sm")
                loaded_models["en_core_web_sm"] = nlp
                return nlp
            except OSError:
                return None
        return None


def main():
    try:
        # Check if text is provided via stdin or argument
        if len(sys.argv) > 1:
            input_text = sys.argv[1]
        else:
            input_text = sys.stdin.read()

        try:
            data = json.loads(input_text)
            text = data.get("text", "")
            context = data.get("context", "")
            lang = data.get("language", "en")  # Default to English
            if not text and context:
                text = context
        except json.JSONDecodeError:
            text = input_text
            lang = "en"

        if not text:
            print(json.dumps({"error": "No text provided"}))
            return

        nlp = get_model(lang)
        if not nlp:
            print(json.dumps({"error": f"Model for language '{lang}' not found."}))
            return

        doc = nlp(text)

        entities = []
        for ent in doc.ents:
            entities.append(
                {
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "confidence": 1.0,
                }
            )

        relationships = []
        # Basic dependency parsing for relationship extraction
        for token in doc:
            if token.dep_ in ("nsubj", "dobj", "pobj"):
                head = token.head
                relationships.append(
                    {
                        "subject": token.text,
                        "predicate": token.dep_,
                        "object": head.text,
                        "sentence_idx": token.sent.start,
                    }
                )

        # Enhanced relationship extraction using SVO triples
        svo_relationships = []
        for token in doc:
            if token.pos_ == "VERB":
                subj = [child for child in token.children if child.dep_ == "nsubj"]
                obj = [child for child in token.children if child.dep_ in ("dobj", "attr", "acomp")]

                if subj and obj:
                    for s in subj:
                        for o in obj:
                            svo_relationships.append(
                                {
                                    "subject": s.text,
                                    "predicate": token.lemma_,
                                    "object": o.text,
                                    "confidence": 0.8,
                                    "provenance": "dependency_parse",
                                }
                            )

        output = {
            "entities": entities,
            "relationships": svo_relationships,
            "raw_deps": relationships,
            "language": lang,
        }

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    main()
